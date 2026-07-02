import { createHash, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ImportStatus,
  Prisma,
  PrismaClient,
  ProductType,
  RecordStatus,
  UserRole,
  WineColor
} from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");

loadEnv(path.join(appDir, ".env"));

const prisma = new PrismaClient();

const requiredColumns = ["name", "type", "wine_color", "grape"];
const importColumns = [
  "name",
  "type",
  "wine_color",
  "grape",
  "country",
  "supplier",
  "vintage",
  "barcode",
  "sale_price",
  "photo_url",
  "notes"
];

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function normalizeImportText(rawText) {
  return rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function fileHash(rawText) {
  return createHash("sha256").update(normalizeImportText(rawText)).digest("hex");
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeColumnName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function supplierKey(supplierId) {
  return supplierId ?? "sem_fornecedor";
}

function optional(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeBarcode(value) {
  return String(value ?? "").trim().replace(/\s+/g, "");
}

function isValidGtin(value) {
  const gtin = normalizeBarcode(value);
  if (!/^\d+$/.test(gtin) || ![8, 12, 13, 14].includes(gtin.length)) {
    return false;
  }

  const digits = gtin.split("").map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return checkDigit === (10 - (sum % 10)) % 10;
}

function optionalBarcode(value) {
  const barcode = normalizeBarcode(value);
  if (!barcode) return { value: null, invalid: false };

  return {
    value: barcode,
    invalid: !isValidGtin(barcode)
  };
}

function parseProductType(value) {
  const normalized = normalizeText(value);
  if (["vinho", "wine"].includes(normalized)) return ProductType.WINE;
  if (["espumante", "sparkling"].includes(normalized)) return ProductType.SPARKLING;
  return null;
}

function parseWineColor(value) {
  const normalized = normalizeText(value);
  if (["tinto", "red"].includes(normalized)) return WineColor.RED;
  if (["branco", "white"].includes(normalized)) return WineColor.WHITE;
  if (["rose", "rosado"].includes(normalized)) return WineColor.ROSE;
  return null;
}

function normalizeMoneyText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const withoutCurrency = text.replace(/[^\d,.-]/g, "");
  const lastComma = withoutCurrency.lastIndexOf(",");
  const lastDot = withoutCurrency.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      return withoutCurrency.replace(/\./g, "").replace(",", ".");
    }

    return withoutCurrency.replace(/,/g, "");
  }

  if (lastComma >= 0) {
    return withoutCurrency.replace(",", ".");
  }

  return withoutCurrency;
}

function optionalMoney(value) {
  const text = String(value ?? "").trim();
  if (!text) return { value: null, invalid: false };

  try {
    const amount = new Prisma.Decimal(normalizeMoneyText(text));
    if (amount.isNegative()) return { value: null, invalid: true };

    return { value: amount.toDecimalPlaces(2), invalid: false };
  } catch {
    return { value: null, invalid: true };
  }
}

function optionalHttpUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return { value: null, invalid: false };

  try {
    const url = new URL(text);
    return {
      value: text,
      invalid: !["http:", "https:"].includes(url.protocol)
    };
  } catch {
    return { value: null, invalid: true };
  }
}

function parseRows(rawText) {
  const normalizedText = normalizeImportText(rawText);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Informe cabecalho e pelo menos uma linha de dados.");
  }

  const delimiter = "\t";
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeColumnName);
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Colunas obrigatorias ausentes: ${missingColumns.join(", ")}.`);
  }

  return lines.slice(1).map((line, index) => {
    const cells = splitDelimitedLine(line, delimiter);
    const values = headers.reduce((row, header, cellIndex) => {
      row[header] = cells[cellIndex] ?? "";
      return row;
    }, {});
    const barcode = optionalBarcode(values.barcode);
    const salePrice = optionalMoney(values.sale_price);
    const photoUrl = optionalHttpUrl(values.photo_url);

    return {
      rowNumber: index + 2,
      sku: String(values.sku ?? "").trim().toUpperCase(),
      name: String(values.name ?? "").trim(),
      type: parseProductType(values.type),
      wineColor: parseWineColor(values.wine_color),
      grape: String(values.grape ?? "").trim(),
      country: optional(values.country),
      supplierName: optional(values.supplier),
      vintage: optional(values.vintage),
      barcode: barcode.value,
      barcodeInvalid: barcode.invalid,
      salePrice: salePrice.value,
      salePriceInvalid: salePrice.invalid,
      photoUrl: photoUrl.value,
      photoUrlInvalid: photoUrl.invalid,
      notes: optional(values.notes)
    };
  });
}

function productIdentity(row) {
  return [
    row.name,
    row.type ?? "",
    row.wineColor ?? "",
    row.grape,
    row.country ?? "",
    row.supplierName ?? "",
    row.vintage ?? ""
  ]
    .map((value) => normalizeText(value))
    .join("|");
}

function validateRows(rows) {
  const errors = [];
  const seenIdentity = new Map();
  const seenBarcodeVintage = new Map();
  const seenPhoto = new Map();

  for (const row of rows) {
    const identity = productIdentity(row);

    if (!row.name) errors.push(`Linha ${row.rowNumber}: nome obrigatorio.`);
    if (!row.type) errors.push(`Linha ${row.rowNumber}: tipo invalido.`);
    if (!row.wineColor) errors.push(`Linha ${row.rowNumber}: cor invalida.`);
    if (!row.grape) errors.push(`Linha ${row.rowNumber}: uva obrigatoria.`);
    if (row.barcodeInvalid) errors.push(`Linha ${row.rowNumber}: GTIN invalido.`);
    if (row.salePriceInvalid) errors.push(`Linha ${row.rowNumber}: preco invalido.`);
    if (row.photoUrlInvalid) errors.push(`Linha ${row.rowNumber}: URL de foto invalida.`);

    if (seenIdentity.has(identity)) {
      errors.push(
        `Linha ${row.rowNumber}: produto duplicado com linha ${seenIdentity.get(identity)}.`
      );
    } else {
      seenIdentity.set(identity, row.rowNumber);
    }

    if (row.barcode) {
      const key = `${row.barcode}|${row.vintage ?? ""}`;
      const existing = seenBarcodeVintage.get(key);
      if (existing && existing.identity !== identity) {
        errors.push(
          `Linha ${row.rowNumber}: codigo de barras+safra duplicado com linha ${existing.rowNumber}.`
        );
      } else {
        seenBarcodeVintage.set(key, { rowNumber: row.rowNumber, identity });
      }
    }

    if (row.photoUrl) {
      const existing = seenPhoto.get(row.photoUrl);
      if (existing && existing.identity !== identity) {
        errors.push(
          `Linha ${row.rowNumber}: foto duplicada com produto diferente na linha ${existing.rowNumber}.`
        );
      } else {
        seenPhoto.set(row.photoUrl, { rowNumber: row.rowNumber, identity });
      }
    }
  }

  return errors;
}

function productLookupWhere(row, supplierId) {
  const candidates = [];

  if (row.sku) candidates.push({ sku: row.sku });
  if (row.barcode) candidates.push({ barcode: row.barcode, vintage: row.vintage });
  if (row.name && row.type && row.wineColor && row.grape) {
    candidates.push({
      name: row.name,
      type: row.type,
      wineColor: row.wineColor,
      grape: row.grape,
      country: row.country,
      supplierId,
      vintage: row.vintage
    });
  }

  return candidates.length > 0 ? { OR: candidates } : { id: "__none__" };
}

async function findOrCreateSupplier(tx, supplierName) {
  if (!supplierName) return null;

  const existing = await tx.supplier.findFirst({
    where: { name: { equals: supplierName, mode: "insensitive" } }
  });
  if (existing) return existing;

  return tx.supplier.create({
    data: { name: supplierName, status: RecordStatus.ACTIVE }
  });
}

async function findOrCreateProductFamily(tx, input) {
  const normalizedName = normalizeText(input.name);
  const key = supplierKey(input.supplierId);

  return tx.productFamily.upsert({
    where: {
      normalizedName_type_supplierKey: {
        normalizedName,
        type: input.type,
        supplierKey: key
      }
    },
    create: {
      normalizedName,
      displayName: input.name,
      type: input.type,
      supplierId: input.supplierId,
      supplierKey: key
    },
    update: {
      displayName: input.name,
      supplierId: input.supplierId,
      supplierKey: key
    }
  });
}

async function findProductForImport(client, row, supplierId) {
  return client.product.findFirst({
    where: productLookupWhere(row, supplierId),
    include: { productFamily: true }
  });
}

async function countExistingMatches(rows) {
  let existing = 0;

  for (const row of rows) {
    const supplier = row.supplierName
      ? await prisma.supplier.findFirst({
          where: { name: { equals: row.supplierName, mode: "insensitive" } }
        })
      : null;
    const product = await findProductForImport(prisma, row, supplier?.id ?? null);
    if (product) existing += 1;
  }

  return existing;
}

async function importRows(rows, rawText, fileName, userId) {
  const hash = fileHash(rawText);
  const duplicateBatch = await prisma.importBatch.findUnique({
    where: { fileHash: hash }
  });

  if (duplicateBatch) {
    throw new Error("Esta planilha ja foi aplicada anteriormente.");
  }

  return prisma.$transaction(
    async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          fileName,
          fileHash: hash,
          status: ImportStatus.DRAFT,
          totalRows: rows.length,
          validRows: rows.length,
          errorRows: 0,
          userId
        }
      });

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const supplier = await findOrCreateSupplier(tx, row.supplierName);
        const existingProduct = await findProductForImport(
          tx,
          row,
          supplier?.id ?? null
        );
        const effectiveSupplierId = supplier?.id ?? existingProduct?.supplierId ?? null;
        const family = await findOrCreateProductFamily(tx, {
          name: row.name,
          type: row.type,
          supplierId: effectiveSupplierId
        });

        if (existingProduct) {
          if (existingProduct.status !== RecordStatus.ACTIVE) {
            throw new Error(`Linha ${row.rowNumber}: produto existente esta inativo.`);
          }

          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              productFamilyId: family.id,
              name: row.name,
              type: row.type,
              wineColor: row.wineColor,
              grape: row.grape,
              country: row.country ?? existingProduct.country,
              supplierId: effectiveSupplierId,
              vintage: row.vintage ?? existingProduct.vintage,
              barcode: row.barcode ?? existingProduct.barcode,
              salePrice: row.salePrice ?? undefined,
              photoUrl: row.photoUrl ?? undefined,
              notes: row.notes ?? undefined
            }
          });
          updated += 1;
        } else {
          await tx.product.create({
            data: {
              productFamilyId: family.id,
              sku: row.sku || `AUTO-${randomUUID()}`,
              name: row.name,
              type: row.type,
              wineColor: row.wineColor,
              grape: row.grape,
              country: row.country,
              supplierId: effectiveSupplierId,
              vintage: row.vintage,
              barcode: row.barcode,
              salePrice: row.salePrice,
              photoUrl: row.photoUrl,
              notes: row.notes,
              status: RecordStatus.ACTIVE
            }
          });
          created += 1;
        }
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: { status: ImportStatus.IMPORTED }
      });

      return { batchId: batch.id, created, updated };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 120000
    }
  );
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  const filePath = path.resolve(appDir, fileArg ?? "");

  if (!fileArg || !fs.existsSync(filePath)) {
    throw new Error("Informe um caminho de TSV existente.");
  }

  const rawText = fs.readFileSync(filePath, "utf8");
  const rows = parseRows(rawText);
  const validationErrors = validateRows(rows);

  if (validationErrors.length > 0) {
    console.log(JSON.stringify({ ok: false, validationErrors }, null, 2));
    process.exitCode = 1;
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, status: RecordStatus.ACTIVE },
    orderBy: { createdAt: "asc" }
  });

  if (!admin) {
    throw new Error("Nenhum administrador ativo encontrado para registrar o lote.");
  }

  const before = {
    products: await prisma.product.count(),
    families: await prisma.productFamily.count(),
    suppliers: await prisma.supplier.count(),
    importBatches: await prisma.importBatch.count()
  };
  const existingMatches = await countExistingMatches(rows);

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "dry-run",
          file: filePath,
          rows: rows.length,
          existingMatches,
          wouldCreate: rows.length - existingMatches,
          wouldUpdate: existingMatches,
          before
        },
        null,
        2
      )
    );
    return;
  }

  const result = await importRows(rows, rawText, path.basename(filePath), admin.id);
  const after = {
    products: await prisma.product.count(),
    families: await prisma.productFamily.count(),
    suppliers: await prisma.supplier.count(),
    importBatches: await prisma.importBatch.count()
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "apply",
        file: filePath,
        rows: rows.length,
        before,
        after,
        ...result
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
