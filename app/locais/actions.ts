"use server";

import { LocationType, RecordStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireActionPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureNoLocationBalance } from "@/services/inventory.service";

export async function createLocation(formData: FormData) {
  await requireActionPermission("locations:write");

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "") as LocationType;
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    throw new Error("Nome do local e obrigatorio.");
  }

  if (!code) {
    throw new Error("Codigo do local e obrigatorio.");
  }

  if (!Object.values(LocationType).includes(type)) {
    throw new Error("Tipo de local invalido.");
  }

  await prisma.storageLocation.create({
    data: {
      name,
      code,
      type,
      description: description || null
    }
  });

  revalidatePath("/locais");
}

export async function inactivateLocation(formData: FormData) {
  await requireActionPermission("locations:write");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Local nao informado.");
  }

  await prisma.$transaction(async (tx) => {
    await ensureNoLocationBalance(tx, id);

    await tx.storageLocation.update({
      where: { id },
      data: { status: RecordStatus.INACTIVE }
    });
  });

  revalidatePath("/locais");
}

export async function reactivateLocation(formData: FormData) {
  await requireActionPermission("locations:write");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Local nao informado.");
  }

  await prisma.storageLocation.update({
    where: { id },
    data: { status: RecordStatus.ACTIVE }
  });

  revalidatePath("/locais");
}
