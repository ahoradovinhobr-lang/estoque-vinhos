"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActionPermission } from "@/lib/auth";
import {
  createEntry,
  createExit,
  createInventoryAudit,
  createTransfer
} from "@/services/movements.service";

type QuickActionResult = "entrada" | "saida" | "transferencia" | "inventario";

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

function revalidateQuickReadingPaths() {
  revalidatePath("/");
  revalidatePath("/busca");
  revalidatePath("/leitura");
  revalidatePath("/movimentacoes");
  revalidatePath("/inventario");
  revalidatePath("/produtos");
}

function redirectToReading(formData: FormData, result: QuickActionResult): never {
  const barcode = optionalText(formData, "returnBarcode");
  const searchParams = new URLSearchParams({ sucesso: result });

  if (barcode) {
    searchParams.set("codigo", barcode);
  }

  redirect(`/leitura?${searchParams.toString()}`);
}

export async function quickRegisterEntry(formData: FormData) {
  const user = await requireActionPermission("stock:write");

  await createEntry({
    productId: requiredText(formData, "productId", "Produto"),
    destinationLocationId: requiredText(
      formData,
      "destinationLocationId",
      "Local de destino"
    ),
    supplierId: optionalText(formData, "supplierId"),
    quantity: requiredInteger(formData, "quantity", "Quantidade"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateQuickReadingPaths();
  redirectToReading(formData, "entrada");
}

export async function quickRegisterExit(formData: FormData) {
  const user = await requireActionPermission("stock:write");

  await createExit({
    productId: requiredText(formData, "productId", "Produto"),
    sourceLocationId: requiredText(
      formData,
      "sourceLocationId",
      "Local de origem"
    ),
    quantity: requiredInteger(formData, "quantity", "Quantidade"),
    reason: requiredText(formData, "reason", "Motivo"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateQuickReadingPaths();
  redirectToReading(formData, "saida");
}

export async function quickRegisterTransfer(formData: FormData) {
  const user = await requireActionPermission("stock:write");

  await createTransfer({
    productId: requiredText(formData, "productId", "Produto"),
    sourceLocationId: requiredText(
      formData,
      "sourceLocationId",
      "Local de origem"
    ),
    destinationLocationId: requiredText(
      formData,
      "destinationLocationId",
      "Local de destino"
    ),
    quantity: requiredInteger(formData, "quantity", "Quantidade"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateQuickReadingPaths();
  redirectToReading(formData, "transferencia");
}

export async function quickRegisterInventoryAudit(formData: FormData) {
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

  revalidateQuickReadingPaths();
  redirectToReading(formData, "inventario");
}
