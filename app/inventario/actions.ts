"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applyInventoryAudit,
  createInventoryAudit,
  ignoreInventoryAudit
} from "@/services/movements.service";
import { requireActionPermission } from "@/lib/auth";

function requiredText(formData: FormData, field: string, label: string): string {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} e obrigatorio.`);
  }

  return value;
}

function optionalText(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? "").trim();
  return value || null;
}

function requiredInteger(
  formData: FormData,
  field: string,
  label: string
): number {
  const value = Number(formData.get(field));

  if (!Number.isInteger(value)) {
    throw new Error(`${label} deve ser um numero inteiro.`);
  }

  return value;
}

function revalidateInventoryPaths() {
  revalidatePath("/");
  revalidatePath("/busca");
  revalidatePath("/leitura");
  revalidatePath("/inventario");
  revalidatePath("/inventario/novo");
  revalidatePath("/movimentacoes");
}

export async function registerInventoryAudit(formData: FormData) {
  const user = await requireActionPermission("inventory:audit");

  await createInventoryAudit({
    productId: requiredText(formData, "productId", "Produto"),
    storageLocationId: requiredText(
      formData,
      "storageLocationId",
      "Local conferido"
    ),
    countedQuantity: requiredInteger(
      formData,
      "countedQuantity",
      "Quantidade contada"
    ),
    applyAdjustment: formData.get("applyAdjustment") === "on",
    reason: optionalText(formData, "reason"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateInventoryPaths();
  redirect("/inventario");
}

export async function approveInventoryAudit(formData: FormData) {
  const user = await requireActionPermission("inventory:audit");

  await applyInventoryAudit({
    inventoryAuditId: requiredText(
      formData,
      "inventoryAuditId",
      "Conferencia"
    ),
    reason: requiredText(formData, "reason", "Justificativa"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateInventoryPaths();
  redirect("/inventario");
}

export async function ignorePendingInventoryAudit(formData: FormData) {
  await requireActionPermission("inventory:audit");

  await ignoreInventoryAudit({
    inventoryAuditId: requiredText(
      formData,
      "inventoryAuditId",
      "Conferencia"
    ),
    reason: requiredText(formData, "reason", "Justificativa")
  });

  revalidateInventoryPaths();
  redirect("/inventario");
}
