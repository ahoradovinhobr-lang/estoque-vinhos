"use server";

import { RecordStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireActionPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createSupplier(formData: FormData) {
  await requireActionPermission("suppliers:write");

  const name = String(formData.get("name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    throw new Error("Nome do fornecedor e obrigatorio.");
  }

  await prisma.supplier.create({
    data: {
      name,
      document: document || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null
    }
  });

  revalidatePath("/fornecedores");
}

export async function inactivateSupplier(formData: FormData) {
  await requireActionPermission("suppliers:write");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Fornecedor nao informado.");
  }

  await prisma.supplier.update({
    where: { id },
    data: { status: RecordStatus.INACTIVE }
  });

  revalidatePath("/fornecedores");
}

export async function reactivateSupplier(formData: FormData) {
  await requireActionPermission("suppliers:write");

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Fornecedor nao informado.");
  }

  await prisma.supplier.update({
    where: { id },
    data: { status: RecordStatus.ACTIVE }
  });

  revalidatePath("/fornecedores");
}
