import { createHash } from "crypto";
import {
  ImportStatus,
  Prisma,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";

import { normalizeText, supplierKey } from "@/lib/normalize";
import { parseMoneyInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { parseOptionalHttpUrl } from "@/lib/urls";
import { normalizeBarcode } from "@/services/barcode.service";
import { isValidGtin } from "@/services/gtin.service";
import { generatedInternalSku } from "@/services/product-sku.service";

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
  barcodeInvalid: boolean;
  salePrice: Prisma.Decimal | null;
  salePriceInvalid: boolean;
  photoUrl: string | null;
  photoUrlInvalid: boolean;
  notes: string | null;
};

export type ImportRowReport = {
  rowNumber: number;
  barcode: string | null;
  name: string;
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
  "name",
  "type",
  "wine_color",
  "grape"
];

const optionalColumns = [
  "sku",
  "country",
  "supplier",
  "vintage",
  "barcode",
  "sale_price",
  "photo_url",
  "quantity",
  "location_code",
  "notes"
];

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

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalBarcode(value: string): {
  value: string | null;
  invalid: boolean;
} {
  const barcode = normalizeBarcode(value);

  if (!barcode) {
    return { value: null, invalid: false };
  }

  return {
    value: barcode,
    invalid: !isValidGtin(barcode)
  };
}

function optionalMoney(value: string): {
  value: Prisma.Decimal | null;
  invalid: boolean;
} {
  if (!value.trim()) {
    return { value: null, invalid: false };
  }

  try {
    return {
      value: parseMoneyInput(value, "Valor"),
      invalid: false
    };
  } catch {
    return { value: null, invalid: true };
  }
}

function optionalHttpUrl(value: string): {
  value: string | null;
  invalid: boolean;
} {
  if (!value.trim()) {
    return { value: null, invalid: false };
  }

  try {
    return {
      value: parseOptionalHttpUrl(value, "Foto"),
      invalid: false
    };
  } catch {
    return { value: null, invalid: true };
  }
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
          barcode: null,
          name: "",
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
          barcode: null,
          name: "",
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
          barcode: null,
          name: "",
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
    const salePrice = optionalMoney(rowValue(row, "sale_price"));
    const photoUrl = optionalHttpUrl(rowValue(row, "photo_url"));
    const barcode = optionalBarcode(rowValue(row, "barcode"));

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
      barcode: barcode.value,
      barcodeInvalid: barcode.invalid,
      salePrice: salePrice.value,
      salePriceInvalid: salePrice.invalid,
      photoUrl: photoUrl.value,
      photoUrlInvalid: photoUrl.invalid,
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
    row.vintage ?? ""
  ]
    .map((value) => normalizeText(String(value)))
    .join("|");
}

function productLookupWhere(
  row: ParsedImportRow,
  supplierId: string | null
): Prisma.ProductWhereInput {
  const candidates: Prisma.ProductWhereInput[] = [];

  if (row.sku) {
    candidates.push({ sku: row.sku });
  }

  if (row.barcode) {
    candidates.push({
      barcode: row.barcode,
      vintage: row.vintage
    });
  }

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

async function findProductForImport(
  client: Pick<Tx, "product">,
  row: ParsedImportRow,
  supplierId: string | null
) {
  return client.product.findFirst({
    where: productLookupWhere(row, supplierId),
    include: { productFamily: true }
  });
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

async function validateImportRows(rows: ParsedImportRow[]): Promise<ImportRowReport[]> {
  const reports: ImportRowReport[] = [];
  const seenProductIdentity = new Map<string, number>();
  const seenBarcodeVintage = new Map<
    string,
    { rowNumber: number; identity: string }
  >();

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.name) errors.push("Nome e obrigatorio.");
    if (!row.type) errors.push("Tipo deve ser wine/vinho ou sparkling/espumante.");
    if (!row.wineColor) errors.push("Cor deve ser red/tinto, white/branco ou rose.");
    if (!row.grape) errors.push("Uva e obrigatoria.");
    if (row.barcodeInvalid) {
      errors.push(
        "barcode deve ser um GTIN valido com 8, 12, 13 ou 14 digitos."
      );
    }
    if (row.salePriceInvalid) errors.push("sale_price deve ser valor monetario valido.");
    if (row.photoUrlInvalid) errors.push("photo_url deve ser URL http ou https valida.");

    const identity = productIdentity(row);
    const firstDuplicateRow = seenProductIdentity.get(identity);

    if (firstDuplicateRow) {
      errors.push(
        `Produto repetido na linha ${firstDuplicateRow}. Mantenha uma unica linha por cadastro.`
      );
    } else {
      seenProductIdentity.set(identity, row.rowNumber);
    }

    if (row.barcode) {
      const barcodeVintageKey = `${row.barcode}|${row.vintage ?? ""}`;
      const existingBarcode = seenBarcodeVintage.get(barcodeVintageKey);

      if (existingBarcode && existingBarcode.identity !== identity) {
        errors.push(
          `Codigo de barras e safra repetidos com outro produto na linha ${existingBarcode.rowNumber}.`
        );
      } else {
        seenBarcodeVintage.set(barcodeVintageKey, {
          rowNumber: row.rowNumber,
          identity
        });
      }
    }

    const supplier = row.supplierName
      ? await findSupplierByNameForSimulation(row.supplierName)
      : null;
    const product = await findProductForImport(
      prisma,
      row,
      supplier?.id ?? null
    );

    if (product && product.status !== RecordStatus.ACTIVE) {
      errors.push("Produto ja existe, mas esta inativo.");
    }

    if (product && normalizeText(product.name) !== normalizeText(row.name)) {
      errors.push("Produto existente tem nome diferente.");
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

    if (
      product &&
      row.country &&
      normalizeText(product.country ?? "") !== normalizeText(row.country)
    ) {
      errors.push("Produto existente tem pais diferente.");
    }

    if (product && (product.vintage ?? "") !== (row.vintage ?? "")) {
      errors.push("Produto existente tem safra diferente.");
    }

    if (
      product &&
      row.supplierName &&
      (product.supplierId ?? null) !== (supplier?.id ?? null)
    ) {
      errors.push("Produto existente tem fornecedor diferente.");
    }

    if (product && row.barcode && product.barcode && product.barcode !== row.barcode) {
      errors.push("Produto existente tem codigo de barras diferente.");
    }

    if (row.barcode && row.type) {
      const possibleFamilySupplierId =
        supplier?.id ?? product?.supplierId ?? null;
      const possibleFamilyKey = supplierKey(possibleFamilySupplierId);
      const normalizedName = normalizeText(row.name);
      const productsWithBarcode = await prisma.product.findMany({
        where: product
          ? { barcode: row.barcode, id: { not: product.id } }
          : { barcode: row.barcode },
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

    if (!row.barcode) {
      warnings.push("Produto sem codigo de barras.");
    }

    reports.push({
      rowNumber: row.rowNumber,
      barcode: row.barcode,
      name: row.name,
      status: errors.length > 0 ? "error" : "valid",
      action: product
        ? "Atualizar cadastro de produto existente"
        : "Criar cadastro de produto",
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
      : await validateImportRows(parsedRows);

  if (duplicateBatch) {
    rowReports.unshift({
      rowNumber: 1,
      barcode: null,
      name: "",
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
    fileName: input.fileName.trim() || "cadastro-vinhos.csv",
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
      if (
        !row.name ||
        !row.type ||
        !row.wineColor ||
        !row.grape ||
        row.barcodeInvalid ||
        row.salePriceInvalid ||
        row.photoUrlInvalid
      ) {
        throw new Error(`Linha ${row.rowNumber} invalida.`);
      }

      const supplier = await findOrCreateSupplier(tx, row.supplierName);
      const existingProduct = await findProductForImport(
        tx,
        row,
        supplier?.id ?? null
      );
      const effectiveSupplierId =
        supplier?.id ?? existingProduct?.supplierId ?? null;
      const family = await findOrCreateProductFamily(tx, {
        name: row.name,
        type: row.type,
        supplierId: effectiveSupplierId
      });
      if (existingProduct) {
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
      } else {
        await tx.product.create({
          data: {
            productFamilyId: family.id,
            sku: row.sku || generatedInternalSku(),
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
            notes: row.notes
          }
        });
      }
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
