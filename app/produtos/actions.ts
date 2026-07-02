"use server";

import { ProductType, RecordStatus, WineColor } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireActionPermission } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { parseOptionalHttpUrl } from "@/lib/urls";
import {
  ensureNoProductBalance,
  ensureProductHasNoOperationalHistory
} from "@/services/inventory.service";
import { generatedInternalSku } from "@/services/product-sku.service";
import { findOrCreateProductFamily } from "@/services/products.service";

export async function createProduct(formData: FormData) {
  await requireActionPermission("products:write");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as ProductType;
  const wineColor = String(formData.get("wineColor") ?? "").trim() as WineColor;
  const grape = String(formData.get("grape") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
  const vintage = String(formData.get("vintage") ?? "").trim();
  const barcode = String(formData.get("barcode") ?? "").trim();
  const salePrice = parseMoneyInput(formData.get("salePrice"), "Valor de venda");
  const photoUrl = parseOptionalHttpUrl(formData.get("photoUrl"), "Foto");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    throw new Error("Nome do produto e obrigatorio.");
  }

  if (!Object.values(ProductType).includes(type)) {
    throw new Error("Tipo de produto invalido.");
  }

  if (!Object.values(WineColor).includes(wineColor)) {
    throw new Error("Cor do produto invalida.");
  }

  if (!grape) {
    throw new Error("Uva do produto e obrigatoria.");
  }

  const family = await findOrCreateProductFamily({
    name,
    type,
    supplierId
  });

  if (barcode) {
    const productsWithBarcode = await prisma.product.findMany({
      where: { barcode },
      select: {
        productFamilyId: true,
        vintage: true
      }
    });

    const duplicatedInAnotherFamily = productsWithBarcode.find(
      (product) => product.productFamilyId !== family.id
    );

    if (duplicatedInAnotherFamily) {
      throw new Error(
        "Codigo de barras ja usado por outro produto ou fornecedor."
      );
    }

    const duplicatedSameVintage = productsWithBarcode.find(
      (product) => (product.vintage ?? "") === vintage
    );

    if (duplicatedSameVintage) {
      throw new Error("Codigo de barras ja cadastrado para essa safra.");
    }
  }

  await prisma.product.create({
    data: {
      productFamilyId: family.id,
        sku: generatedInternalSku(),
      name,
      type,
      wineColor,
      grape,
      country: country || null,
      supplierId,
      vintage: vintage || null,
      barcode: barcode || null,
      salePrice,
      photoUrl,
      notes: notes || null
    }
  });

  revalidatePath("/produtos");
  revalidatePath("/busca");
  revalidatePath("/leitura");
}

export async function inactivateProduct(formData: FormData) {
  await requireActionPermission("products:delete");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Produto nao informado.");
  }

  await prisma.$transaction(async (tx) => {
    await ensureNoProductBalance(tx, id);

    await tx.product.update({
      where: { id },
      data: { status: RecordStatus.INACTIVE }
    });
  });

  revalidatePath("/produtos");
  revalidatePath("/busca");
  revalidatePath("/leitura");
}

export async function reactivateProduct(formData: FormData) {
  await requireActionPermission("products:delete");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Produto nao informado.");
  }

  await prisma.product.update({
    where: { id },
    data: { status: RecordStatus.ACTIVE }
  });

  revalidatePath("/produtos");
  revalidatePath("/busca");
  revalidatePath("/leitura");
}

export async function deleteProduct(formData: FormData) {
  await requireActionPermission("products:delete");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Produto nao informado.");
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    await ensureProductHasNoOperationalHistory(tx, id);
    await tx.product.delete({ where: { id } });
  });

  revalidatePath("/produtos");
  revalidatePath("/busca");
  revalidatePath("/leitura");
}
