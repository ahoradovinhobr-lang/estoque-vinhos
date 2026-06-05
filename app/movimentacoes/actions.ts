"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdjustment,
  createEntry,
  createExit,
  createLoss,
  createTransfer,
  reverseMovement
} from "@/services/movements.service";
import { getSystemUserId } from "@/services/system-user.service";

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

function revalidateMovementPaths() {
  revalidatePath("/");
  revalidatePath("/busca");
  revalidatePath("/produtos");
  revalidatePath("/movimentacoes");
}

export async function registerEntry(formData: FormData) {
  const userId = await getSystemUserId();

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
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/entrada");
  redirect("/movimentacoes");
}

export async function registerExit(formData: FormData) {
  const userId = await getSystemUserId();

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
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/saida");
  redirect("/movimentacoes");
}

export async function registerTransfer(formData: FormData) {
  const userId = await getSystemUserId();

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
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/transferencia");
  redirect("/movimentacoes");
}

export async function registerAdjustment(formData: FormData) {
  const userId = await getSystemUserId();

  await createAdjustment({
    productId: requiredText(formData, "productId", "Produto"),
    affectedLocationId: requiredText(
      formData,
      "affectedLocationId",
      "Local afetado"
    ),
    newQuantity: requiredInteger(formData, "newQuantity", "Saldo final"),
    reason: requiredText(formData, "reason", "Justificativa"),
    notes: optionalText(formData, "notes"),
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/ajuste");
  redirect("/movimentacoes");
}

export async function registerLoss(formData: FormData) {
  const userId = await getSystemUserId();

  await createLoss({
    productId: requiredText(formData, "productId", "Produto"),
    affectedLocationId: requiredText(
      formData,
      "affectedLocationId",
      "Local afetado"
    ),
    quantity: requiredInteger(formData, "quantity", "Quantidade"),
    reason: requiredText(formData, "reason", "Justificativa"),
    notes: optionalText(formData, "notes"),
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/perda");
  redirect("/movimentacoes");
}

export async function registerReversal(formData: FormData) {
  const userId = await getSystemUserId();

  await reverseMovement({
    movementId: requiredText(formData, "movementId", "Movimentacao"),
    reason: requiredText(formData, "reason", "Justificativa"),
    notes: optionalText(formData, "notes"),
    userId,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/inventario");
  redirect("/movimentacoes");
}
