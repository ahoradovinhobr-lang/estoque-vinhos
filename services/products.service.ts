import { ProductType } from "@prisma/client";

import { normalizeText, supplierKey } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";

type FindOrCreateFamilyInput = {
  name: string;
  type: ProductType;
  supplierId?: string | null;
};

export async function findOrCreateProductFamily(input: FindOrCreateFamilyInput) {
  const normalizedName = normalizeText(input.name);
  const key = supplierKey(input.supplierId);

  return prisma.productFamily.upsert({
    where: {
      normalizedName_type_supplierKey: {
        normalizedName,
        type: input.type,
        supplierKey: key
      }
    },
    create: {
      normalizedName,
      displayName: input.name.trim(),
      type: input.type,
      supplierId: input.supplierId ?? null,
      supplierKey: key
    },
    update: {
      displayName: input.name.trim(),
      supplierId: input.supplierId ?? null,
      supplierKey: key
    }
  });
}
