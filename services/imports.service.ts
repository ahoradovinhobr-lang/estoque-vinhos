import { createHash } from "crypto";
import {
  ImportStatus,
  MovementType,
  Prisma,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";

import { normalizeText, supplierKey } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

type ParsedImportRow = {
  rowNumber: number;
  sku: string;
  name: string;
  type: ProductType | null;
  wineColor: WineColor | null;
  grape: string;
  country: string | null;
  supplierName: string | null;
  vintage: string | null;
  barcode: string | null;
  quantity: number | null;
  locationCode: string;
  notes: string | null;
};

export type ImportRowReport = {
  rowNumber: number;
  sku: string;
  name: string;
  locationCode: string;
  quantity: number | null;
  status: "valid" | "error";
  action: string;
  errors: string[];
  warnings: string[];
};

export type ImportSimulationResult = {
  fileName: string;
  fileHash: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdRows: number;
  updatedRows: number;
  ignoredRows: number;
  duplicateFile: boolean;
  canApply: boolean;
  rawText: string;
  rows: ImportRowReport[];
};

type ApplyImportResult = ImportSimulationResult & {
  batchId: string | null;
  applied: boolean;
};

const requiredColumns = [
  "sku",
  "name",
  "type",
  "wine_color",
  "grape",
  "quantity",
  "location_code"
];

const optionalColumns = ["country", "supplier", "vintage", "barcode", "notes"];

const serializable = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
};

function normalizeImportText(rawText: string): string {
  return rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function fileHash(rawText: string): string {
  return createHash("sha256").update(normalizeImportText(rawText)).digest("hex");
}

function detectDelimiter(headerLine: string): string {
  const candidates = ["\t", ";", ","];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: splitDelimitedLine(headerLine, delimiter).length
    }))
    .sort((first, second) => second.count - first.count)[0].delimiter;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
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

function parseProductType(value: string): ProductType | null {
  const normalized = normalizeText(value);

  if (["vinho", "wine"].includes(normalized)) {
    return ProductType.WINE;
  }

  if (["espumante", "sparkling"].includes(normalized)) {
    return ProductType.SPARKLING;
  }

  return null;
}

function parseWineColor(value: string): WineColor | null {
  const normalized = normalizeText(value);

  if (["tinto", "red"].includes(normalized)) {
    return WineColor.RED;
  }

  if (["branco", "white"].includes(normalized)) {
    return WineColor.WHITE;
  }

  if (["rose", "rosado"].includes(normalized)) {
    return WineColor.ROSE;
  }

  return null;
}

function parseQuantity(value: string): number | null {
  const quantity = Number(value.replace(",", "."));

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return null;
  }

  return quantity;
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeColumnName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowValue(
  row: Record<string, string>,
  column: string,
  fallback = ""
): string {
  return row[column]?.trim() ?? fallback;
}

function parseRows(rawText: string): {
  parsedRows: ParsedImportRow[];
  structuralErrors: ImportRowReport[];
} {
  const normalizedText = normalizeImportText(rawText);

  if (!normalizedText) {
    return {
      parsedRows: [],
      structuralErrors: [
        {
          rowNumber: 1,
          sku: "",
          name: "",
          locationCode: "",
          quantity: null,
          status: "error",
          action: "Corrigir arquivo",
          errors: ["Conteudo da planilha e obrigatorio."],
          warnings: []
        }
      ]
    };
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      parsedRows: [],
      structuralErrors: [
        {
          rowNumber: 1,
          sku: "",
          name: "",
          locationCode: "",
          quantity: null,
          status: "error",
          action: "Corrigir arquivo",
          errors: ["Informe cabecalho e pelo menos uma linha de dados."],
          warnings: []
        }
      ]
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) =>
    normalizeColumnName(header)
  );
  const missingColumns = requiredColumns.filter(
    (column) => !headers.includes(column)
  );

  if (missingColumns.length > 0) {
    return {
      parsedRows: [],
      structuralErrors: [
        {
          rowNumber: 1,
          sku: "",
          name: "",
          locationCode: "",
          quantity: null,
          status: "error",
          action: "Corrigir cabecalho",
          errors: [`Colunas obrigatorias ausentes: ${missingColumns.join(", ")}.`],
          warnings: [
            `Colunas esperadas: ${requiredColumns
              .concat(optionalColumns)
              .join(", ")}.`
          ]
        }
      ]
    };
  }

  const parsedRows = lines.slice(1).map((line, index) => {
    const cells = splitDelimitedLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((values, header, cellIndex) => {
      values[header] = cells[cellIndex] ?? "";
      return values;
    }, {});

    return {
      rowNumber: index + 2,
      sku: rowValue(row, "sku").toUpperCase(),
      name: rowValue(row, "name"),
      type: parseProductType(rowValue(row, "type")),
      wineColor: parseWineColor(rowValue(row, "wine_color")),
      grape: rowValue(row, "grape"),
      country: optional(rowValue(row, "country")),
      supplierName: optional(rowValue(row, "supplier")),
      vintage: optional(rowValue(row, "vintage")),
      barcode: optional(rowValue(row, "barcode")),
      quantity: parseQuantity(rowValue(row, "quantity")),
      locationCode: rowValue(row, "location_code").toUpperCase(),
      notes: optional(rowValue(row, "notes"))
    };
  });

  return { parsedRows, structuralErrors: [] };
}

function productIdentity(row: ParsedImportRow): string {
  return [
    row.name,
    row.type ?? "",
    row.wineColor ?? "",
    row.grape,
    row.country ?? "",
    row.supplierName ?? "",
    row.vintage ?? "",
    row.barcode ?? ""
  ]
    .map((value) => normalizeText(String(value)))
    .join("|");
}

function supplierNameWhere(supplierName: string) {
  return {
    where: {
      name: {
        equals: supplierName,
        mode: "insensitive"
      }
    }
  } satisfies Prisma.SupplierFindFirstArgs;
}

async function findSupplierByNameForSimulation(supplierName: string) {
  return prisma.supplier.findFirst(supplierNameWhere(supplierName));
}

async function findOrCreateSupplier(tx: Tx, supplierName: string | null) {
  if (!supplierName) {
    return null;
  }

  const existingSupplier = await tx.supplier.findFirst(
    supplierNameWhere(supplierName)
  );

  if (existingSupplier) {
    return existingSupplier;
  }

  return tx.supplier.create({
    data: {
      name: supplierName,
      status: RecordStatus.ACTIVE
    }
  });
}

async function findOrCreateProductFamily(
  tx: Tx,
  input: {
    name: string;
    type: ProductType;
    supplierId: string | null;
  }
) {
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

async function validateImportRows(
  rows: ParsedImportRow[],
  hash: string
): Promise<ImportRowReport[]> {
  const reports: ImportRowReport[] = [];
  const seenSkuLocation = new Map<string, number>();
  const seenSkuIdentity = new Map<string, string>();
  const seenBarcodeVintage = new Map<string, { rowNumber: number; sku: string }>();

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.sku) errors.push("SKU e obrigatorio.");
    if (!row.name) errors.push("Nome e obrigatorio.");
    if (!row.type) errors.push("Tipo deve ser wine/vinho ou sparkling/espumante.");
    if (!row.wineColor) errors.push("Cor deve ser red/tinto, white/branco ou rose.");
    if (!row.grape) errors.push("Uva e obrigatoria.");
    if (!row.locationCode) errors.push("location_code e obrigatorio.");
    if (!row.quantity) errors.push("Quantidade deve ser inteiro maior que zero.");

    const skuLocationKey = `${row.sku}|${row.locationCode}`;
    const firstDuplicateRow = seenSkuLocation.get(skuLocationKey);

    if (firstDuplicateRow) {
      errors.push(
        `SKU e local repetidos na linha ${firstDuplicateRow}. Consolide a quantidade antes de importar.`
      );
    } else {
      seenSkuLocation.set(skuLocationKey, row.rowNumber);
    }

    const identity = productIdentity(row);
    const existingIdentity = seenSkuIdentity.get(row.sku);

    if (existingIdentity && existingIdentity !== identity) {
      errors.push(
        "Mesmo SKU aparece com caracteristicas diferentes na planilha."
      );
    } else {
      seenSkuIdentity.set(row.sku, identity);
    }

    if (row.barcode) {
      const barcodeVintageKey = `${row.barcode}|${row.vintage ?? ""}`;
      const existingBarcode = seenBarcodeVintage.get(barcodeVintageKey);

      if (existingBarcode && existingBarcode.sku !== row.sku) {
        errors.push(
          `Codigo de barras e safra repetidos com outro SKU na linha ${existingBarcode.rowNumber}.`
        );
      } else {
        seenBarcodeVintage.set(barcodeVintageKey, {
          rowNumber: row.rowNumber,
          sku: row.sku
        });
      }
    }

    const [location, product, supplier, movementWithKey] = await Promise.all([
      row.locationCode
        ? prisma.storageLocation.findUnique({
            where: { code: row.locationCode }
          })
        : null,
      row.sku
        ? prisma.product.findUnique({
            where: { sku: row.sku },
            include: { productFamily: true }
          })
        : null,
      row.supplierName ? findSupplierByNameForSimulation(row.supplierName) : null,
      prisma.stockMovement.findUnique({
        where: { idempotencyKey: `${hash}:line:${row.rowNumber}` }
      })
    ]);

    if (!location) {
      errors.push("Local de armazenamento nao encontrado.");
    } else if (location.status !== RecordStatus.ACTIVE) {
      errors.push("Local de armazenamento esta inativo.");
    }

    if (movementWithKey) {
      errors.push("Linha ja foi importada anteriormente.");
    }

    if (product && product.status !== RecordStatus.ACTIVE) {
      errors.push("Produto ja existe, mas esta inativo.");
    }

    if (product && row.type && product.type !== row.type) {
      errors.push("Produto existente tem tipo diferente.");
    }

    if (product && row.wineColor && product.wineColor !== row.wineColor) {
      errors.push("Produto existente tem cor diferente.");
    }

    if (product && product.grape !== row.grape) {
      errors.push("Produto existente tem uva diferente.");
    }

    if (product && row.barcode && product.barcode && product.barcode !== row.barcode) {
      errors.push("Produto existente tem codigo de barras diferente.");
    }

    if (!product && row.barcode && row.type) {
      const possibleFamilySupplierId = supplier?.id ?? null;
      const possibleFamilyKey = supplierKey(possibleFamilySupplierId);
      const normalizedName = normalizeText(row.name);
      const productsWithBarcode = await prisma.product.findMany({
        where: { barcode: row.barcode },
        include: { productFamily: true }
      });
      const duplicatedInAnotherFamily = productsWithBarcode.find(
        (existingProduct) =>
          existingProduct.productFamily.normalizedName !== normalizedName ||
          existingProduct.productFamily.type !== row.type ||
          existingProduct.productFamily.supplierKey !== possibleFamilyKey
      );
      const duplicatedSameVintage = productsWithBarcode.find(
        (existingProduct) => (existingProduct.vintage ?? "") === (row.vintage ?? "")
      );

      if (duplicatedInAnotherFamily) {
        errors.push("Codigo de barras ja usado por outro produto ou fornecedor.");
      }

      if (duplicatedSameVintage) {
        errors.push("Codigo de barras ja cadastrado para essa safra.");
      }
    }

    if (row.supplierName && !supplier) {
      warnings.push("Fornecedor sera criado.");
    }

    reports.push({
      rowNumber: row.rowNumber,
      sku: row.sku,
      name: row.name,
      locationCode: row.locationCode,
      quantity: row.quantity,
      status: errors.length > 0 ? "error" : "valid",
      action: product
        ? "Atualizar saldo de produto existente"
        : "Criar produto e entrada",
      errors,
      warnings
    });
  }

  return reports;
}

export async function simulateInitialImport(input: {
  fileName: string;
  rawText: string;
}): Promise<ImportSimulationResult> {
  const rawText = normalizeImportText(input.rawText);
  const hash = fileHash(rawText);
  const { parsedRows, structuralErrors } = parseRows(rawText);
  const duplicateBatch = await prisma.importBatch.findUnique({
    where: { fileHash: hash }
  });
  const rowReports =
    structuralErrors.length > 0
      ? structuralErrors
      : await validateImportRows(parsedRows, hash);

  if (duplicateBatch) {
    rowReports.unshift({
      rowNumber: 1,
      sku: "",
      name: "",
      locationCode: "",
      quantity: null,
      status: "error",
      action: "Arquivo duplicado",
      errors: ["Esta planilha ja foi aplicada anteriormente."],
      warnings: []
    });
  }

  const errorRows = rowReports.filter((row) => row.status === "error").length;
  const validRows = rowReports.filter((row) => row.status === "valid").length;
  const createdRows = rowReports.filter(
    (row) => row.status === "valid" && row.action.startsWith("Criar")
  ).length;
  const updatedRows = rowReports.filter(
    (row) => row.status === "valid" && row.action.startsWith("Atualizar")
  ).length;

  return {
    fileName: input.fileName.trim() || "importacao-inicial.csv",
    fileHash: hash,
    totalRows: parsedRows.length,
    validRows,
    errorRows,
    createdRows,
    updatedRows,
    ignoredRows: 0,
    duplicateFile: Boolean(duplicateBatch),
    canApply: parsedRows.length > 0 && errorRows === 0,
    rawText,
    rows: rowReports
  };
}

async function upsertBalance(
  tx: Tx,
  productId: string,
  storageLocationId: string,
  quantity: number
) {
  const existingBalance = await tx.inventoryBalance.findUnique({
    where: {
      productId_storageLocationId: {
        productId,
        storageLocationId
      }
    }
  });
  const quantityBefore = existingBalance?.quantity ?? 0;
  const quantityAfter = quantityBefore + quantity;

  await tx.inventoryBalance.upsert({
    where: {
      productId_storageLocationId: {
        productId,
        storageLocationId
      }
    },
    create: {
      productId,
      storageLocationId,
      quantity: quantityAfter
    },
    update: {
      quantity: quantityAfter
    }
  });

  return { quantityBefore, quantityAfter };
}

export async function applyInitialImport(input: {
  fileName: string;
  rawText: string;
  userId: string;
}): Promise<ApplyImportResult> {
  const simulation = await simulateInitialImport(input);

  if (!simulation.canApply) {
    return {
      ...simulation,
      batchId: null,
      applied: false
    };
  }

  const { parsedRows } = parseRows(simulation.rawText);

  return prisma.$transaction(async (tx) => {
    const duplicateBatch = await tx.importBatch.findUnique({
      where: { fileHash: simulation.fileHash }
    });

    if (duplicateBatch) {
      throw new Error("Esta planilha ja foi aplicada anteriormente.");
    }

    const batch = await tx.importBatch.create({
      data: {
        fileName: simulation.fileName,
        fileHash: simulation.fileHash,
        status: ImportStatus.DRAFT,
        totalRows: simulation.totalRows,
        validRows: simulation.validRows,
        errorRows: simulation.errorRows,
        userId: input.userId
      }
    });

    for (const row of parsedRows) {
      if (!row.type || !row.wineColor || !row.quantity) {
        throw new Error(`Linha ${row.rowNumber} invalida.`);
      }

      const location = await tx.storageLocation.findUnique({
        where: { code: row.locationCode }
      });

      if (!location || location.status !== RecordStatus.ACTIVE) {
        throw new Error(`Local invalido na linha ${row.rowNumber}.`);
      }

      const [supplier, existingProduct] = await Promise.all([
        findOrCreateSupplier(tx, row.supplierName),
        tx.product.findUnique({ where: { sku: row.sku } })
      ]);
      const family =
        !existingProduct || supplier
          ? await findOrCreateProductFamily(tx, {
              name: row.name,
              type: row.type,
              supplierId: supplier?.id ?? null
            })
          : null;
      const product = existingProduct
        ? await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              name: row.name,
              ...(family && supplier
                ? {
                    productFamilyId: family.id,
                    supplierId: supplier.id
                  }
                : {}),
              notes: row.notes ?? undefined
            }
          })
        : await tx.product.create({
            data: {
              productFamilyId: family!.id,
              sku: row.sku,
              name: row.name,
              type: row.type,
              wineColor: row.wineColor,
              grape: row.grape,
              country: row.country,
              supplierId: supplier?.id ?? null,
              vintage: row.vintage,
              barcode: row.barcode,
              notes: row.notes
            }
          });
      const { quantityBefore, quantityAfter } = await upsertBalance(
        tx,
        product.id,
        location.id,
        row.quantity
      );
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.ENTRY,
          quantity: row.quantity,
          destinationLocationId: location.id,
          supplierId: supplier?.id ?? null,
          importBatchId: batch.id,
          idempotencyKey: `${simulation.fileHash}:line:${row.rowNumber}`,
          reason: "Importacao inicial",
          notes: row.notes,
          userId: input.userId
        }
      });

      await tx.stockMovementLine.create({
        data: {
          stockMovementId: movement.id,
          productId: product.id,
          storageLocationId: location.id,
          quantityBefore,
          quantityDelta: row.quantity,
          quantityAfter
        }
      });
    }

    const importedBatch = await tx.importBatch.update({
      where: { id: batch.id },
      data: { status: ImportStatus.IMPORTED }
    });

    return {
      ...simulation,
      batchId: importedBatch.id,
      applied: true
    };
  }, serializable);
}
