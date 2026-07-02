"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdjustment,
  createEntry,
  createExit,
  createLoss,
  createSaleExit,
  createTransfer,
  reverseMovement
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

function revalidateMovementPaths() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/busca");
  revalidatePath("/leitura");
  revalidatePath("/produtos");
  revalidatePath("/movimentacoes");
}

export async function registerEntry(formData: FormData) {
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

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/entrada");
  redirect("/movimentacoes");
}

export async function registerExit(formData: FormData) {
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

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/saida");
  redirect("/movimentacoes");
}

type SaleExitFormItem = {
  productId?: unknown;
  sourceLocationId?: unknown;
  quantity?: unknown;
};

function parseSaleItems(formData: FormData) {
  const rawItems = requiredText(formData, "items", "Itens da venda");
  const parsedItems = JSON.parse(rawItems) as SaleExitFormItem[];

  if (!Array.isArray(parsedItems)) {
    throw new Error("Itens da venda devem estar em formato de lista.");
  }

  const items = parsedItems
    .map((item) => ({
      productId: String(item.productId ?? "").trim(),
      sourceLocationId: String(item.sourceLocationId ?? "").trim(),
      quantity: Number(item.quantity)
    }))
    .filter(
      (item) => item.productId && item.sourceLocationId && item.quantity > 0
    );

  if (items.length === 0) {
    throw new Error("Informe ao menos um item para venda.");
  }

  for (const item of items) {
    if (!Number.isInteger(item.quantity)) {
      throw new Error("Quantidade de venda deve ser um numero inteiro.");
    }
  }

  return items;
}

export async function registerSaleExit(formData: FormData) {
  const user = await requireActionPermission("stock:sale");

  await createSaleExit({
    channel: requiredText(formData, "channel", "Canal"),
    externalReference: optionalText(formData, "externalReference"),
    notes: optionalText(formData, "notes"),
    items: parseSaleItems(formData),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/venda");
  redirect("/movimentacoes");
}

export async function registerTransfer(formData: FormData) {
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

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/transferencia");
  redirect("/movimentacoes");
}

export async function registerAdjustment(formData: FormData) {
  const user = await requireActionPermission("stock:write");

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
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/ajuste");
  redirect("/movimentacoes");
}

export async function registerLoss(formData: FormData) {
  const user = await requireActionPermission("stock:write");

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
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/movimentacoes/perda");
  redirect("/movimentacoes");
}

export async function registerReversal(formData: FormData) {
  const user = await requireActionPermission("stock:reverse");

  await reverseMovement({
    movementId: requiredText(formData, "movementId", "Movimentacao"),
    reason: requiredText(formData, "reason", "Justificativa"),
    notes: optionalText(formData, "notes"),
    userId: user.id,
    idempotencyKey: optionalText(formData, "idempotencyKey")
  });

  revalidateMovementPaths();
  revalidatePath("/inventario");
  redirect("/movimentacoes");
}
