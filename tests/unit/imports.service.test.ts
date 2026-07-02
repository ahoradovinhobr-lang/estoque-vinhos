import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportStatus, ProductType, WineColor } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    importBatch: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    supplier: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    productFamily: {
      upsert: vi.fn()
    },
    inventoryBalance: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    stockMovement: {
      create: vi.fn()
    },
    stockMovementLine: {
      create: vi.fn()
    },
    $transaction: vi.fn()
  };

  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/services/product-sku.service", () => ({
  generatedInternalSku: () => "AUTO-TEST"
}));

import { applyInitialImport, simulateInitialImport } from "@/services/imports.service";

const catalogText = `name\ttype\twine_color\tgrape\tcountry\tvintage\tbarcode\tsale_price
Vinho Teste\twine\tred\tMalbec\tArgentina\t2022\t4006381333931\t79,90`;

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.importBatch.findUnique.mockResolvedValue(null);
  prismaMock.importBatch.create.mockResolvedValue({
    id: "batch-1",
    status: ImportStatus.DRAFT
  });
  prismaMock.importBatch.update.mockResolvedValue({
    id: "batch-1",
    status: ImportStatus.IMPORTED
  });
  prismaMock.supplier.findFirst.mockResolvedValue(null);
  prismaMock.product.findFirst.mockResolvedValue(null);
  prismaMock.product.findMany.mockResolvedValue([]);
  prismaMock.productFamily.upsert.mockResolvedValue({
    id: "family-1"
  });
  prismaMock.product.create.mockResolvedValue({
    id: "product-1"
  });
  prismaMock.$transaction.mockImplementation(async (callback) =>
    callback(prismaMock)
  );
});

describe("simulateInitialImport", () => {
  it("accepts product catalog rows without quantity or location", async () => {
    const result = await simulateInitialImport({
      fileName: "cadastro.csv",
      rawText: catalogText
    });

    expect(result.canApply).toBe(true);
    expect(result.totalRows).toBe(1);
    expect(result.createdRows).toBe(1);
    expect(result.rows[0]).toMatchObject({
      barcode: "4006381333931",
      name: "Vinho Teste",
      action: "Criar cadastro de produto",
      status: "valid"
    });
  });

  it("rejects invalid barcode values before applying", async () => {
    const result = await simulateInitialImport({
      fileName: "cadastro.csv",
      rawText:
        "name\ttype\twine_color\tgrape\tbarcode\nVinho Teste\twine\tred\tMalbec\t789000000001"
    });

    expect(result.canApply).toBe(false);
    expect(result.errorRows).toBe(1);
    expect(result.rows[0].errors).toContain(
      "barcode deve ser um GTIN valido com 8, 12, 13 ou 14 digitos."
    );
  });
});

describe("applyInitialImport", () => {
  it("creates products without creating inventory balances or stock movements", async () => {
    const result = await applyInitialImport({
      fileName: "cadastro.csv",
      rawText: catalogText,
      userId: "user-1"
    });

    expect(result.applied).toBe(true);
    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sku: "AUTO-TEST",
        name: "Vinho Teste",
        type: ProductType.WINE,
        wineColor: WineColor.RED,
        grape: "Malbec",
        country: "Argentina",
        vintage: "2022",
        barcode: "4006381333931"
      })
    });
    expect(prismaMock.inventoryBalance.upsert).not.toHaveBeenCalled();
    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
    expect(prismaMock.stockMovementLine.create).not.toHaveBeenCalled();
  });
});
