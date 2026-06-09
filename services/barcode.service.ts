import {
  BarcodeLookupSource,
  BarcodeLookupStatus,
  type Prisma
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const productLookupInclude = {
  supplier: true,
  balances: {
    include: {
      storageLocation: true
    }
  }
} satisfies Prisma.ProductInclude;

export type BarcodeLookupProduct = Prisma.ProductGetPayload<{
  include: typeof productLookupInclude;
}>;

type LookupBarcodeProductsInput = {
  barcode: string;
  source?: BarcodeLookupSource;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  shouldRegisterLookup?: boolean;
};

export type LookupBarcodeProductsResult = {
  barcode: string;
  status: BarcodeLookupStatus | null;
  products: BarcodeLookupProduct[];
};

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function lookupStatus(productCount: number): BarcodeLookupStatus {
  if (productCount === 0) {
    return BarcodeLookupStatus.NOT_FOUND;
  }

  if (productCount === 1) {
    return BarcodeLookupStatus.FOUND;
  }

  return BarcodeLookupStatus.AMBIGUOUS;
}

export async function lookupBarcodeProducts(
  input: LookupBarcodeProductsInput
): Promise<LookupBarcodeProductsResult> {
  const barcode = normalizeBarcode(input.barcode);

  if (!barcode) {
    return {
      barcode,
      status: null,
      products: []
    };
  }

  const products = await prisma.product.findMany({
    where: { barcode },
    include: productLookupInclude,
    orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }]
  });
  const status = lookupStatus(products.length);

  if (input.shouldRegisterLookup ?? true) {
    await prisma.barcodeLookup.create({
      data: {
        barcode,
        status,
        source: input.source ?? BarcodeLookupSource.DIRECT_URL,
        matchedProductId: products.length === 1 ? products[0].id : null,
        matchedProductCount: products.length,
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  }

  return {
    barcode,
    status,
    products
  };
}
