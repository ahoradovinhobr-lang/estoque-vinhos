import {
  AuditStatus,
  MovementStatus,
  MovementType,
  Prisma
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseOccurredAt } from "@/lib/time";
import {
  assertActiveLocation,
  assertActiveProduct,
  assertPositiveQuantity,
  getBalanceQuantity,
  setBalanceQuantity
} from "@/services/inventory.service";

type MovementBaseInput = {
  productId: string;
  userId: string;
  notes?: string | null;
  reason?: string | null;
  occurredAt?: Date | string | null;
  idempotencyKey?: string | null;
};

type EntryInput = MovementBaseInput & {
  destinationLocationId: string;
  quantity: number;
  supplierId?: string | null;
};

type ExitInput = MovementBaseInput & {
  sourceLocationId: string;
  quantity: number;
};

type TransferInput = MovementBaseInput & {
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
};

type AdjustmentInput = MovementBaseInput & {
  affectedLocationId: string;
  newQuantity: number;
  inventoryAuditId?: string | null;
};

type LossInput = MovementBaseInput & {
  affectedLocationId: string;
  quantity: number;
};

type ReversalInput = {
  movementId: string;
  userId: string;
  reason: string;
  notes?: string | null;
  occurredAt?: Date | string | null;
  idempotencyKey?: string | null;
};

type Tx = Prisma.TransactionClient;

const serializable = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
};

async function findExistingByIdempotencyKey(
  tx: Tx,
  idempotencyKey?: string | null
) {
  if (!idempotencyKey) {
    return null;
  }

  return tx.stockMovement.findUnique({
    where: { idempotencyKey },
    include: { lines: true }
  });
}

async function createLine(
  tx: Tx,
  input: {
    stockMovementId: string;
    productId: string;
    storageLocationId: string;
    quantityBefore: number;
    quantityDelta: number;
  }
) {
  const quantityAfter = input.quantityBefore + input.quantityDelta;

  if (quantityAfter < 0) {
    throw new Error("Movimentacao deixaria saldo negativo.");
  }

  return tx.stockMovementLine.create({
    data: {
      stockMovementId: input.stockMovementId,
      productId: input.productId,
      storageLocationId: input.storageLocationId,
      quantityBefore: input.quantityBefore,
      quantityDelta: input.quantityDelta,
      quantityAfter
    }
  });
}

export async function createEntry(input: EntryInput) {
  assertPositiveQuantity(input.quantity);

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.destinationLocationId);

    const before = await getBalanceQuantity(
      tx,
      input.productId,
      input.destinationLocationId
    );
    const after = before + input.quantity;

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: MovementType.ENTRY,
        quantity: input.quantity,
        destinationLocationId: input.destinationLocationId,
        supplierId: input.supplierId ?? null,
        notes: input.notes ?? null,
        reason: input.reason ?? null,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.destinationLocationId,
      after
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.destinationLocationId,
      quantityBefore: before,
      quantityDelta: input.quantity
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function createExit(input: ExitInput) {
  assertPositiveQuantity(input.quantity);

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.sourceLocationId);

    const before = await getBalanceQuantity(
      tx,
      input.productId,
      input.sourceLocationId
    );

    if (before < input.quantity) {
      throw new Error("Saldo insuficiente no local de origem.");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: MovementType.EXIT,
        quantity: input.quantity,
        sourceLocationId: input.sourceLocationId,
        notes: input.notes ?? null,
        reason: input.reason ?? null,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.sourceLocationId,
      before - input.quantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.sourceLocationId,
      quantityBefore: before,
      quantityDelta: -input.quantity
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function createTransfer(input: TransferInput) {
  assertPositiveQuantity(input.quantity);

  if (input.sourceLocationId === input.destinationLocationId) {
    throw new Error("Origem e destino devem ser diferentes.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.sourceLocationId);
    await assertActiveLocation(tx, input.destinationLocationId);

    const originBefore = await getBalanceQuantity(
      tx,
      input.productId,
      input.sourceLocationId
    );

    if (originBefore < input.quantity) {
      throw new Error("Saldo insuficiente no local de origem.");
    }

    const destinationBefore = await getBalanceQuantity(
      tx,
      input.productId,
      input.destinationLocationId
    );

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: MovementType.TRANSFER,
        quantity: input.quantity,
        sourceLocationId: input.sourceLocationId,
        destinationLocationId: input.destinationLocationId,
        notes: input.notes ?? null,
        reason: input.reason ?? null,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.sourceLocationId,
      originBefore - input.quantity
    );
    await setBalanceQuantity(
      tx,
      input.productId,
      input.destinationLocationId,
      destinationBefore + input.quantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.sourceLocationId,
      quantityBefore: originBefore,
      quantityDelta: -input.quantity
    });
    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.destinationLocationId,
      quantityBefore: destinationBefore,
      quantityDelta: input.quantity
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function createAdjustment(input: AdjustmentInput) {
  if (!Number.isInteger(input.newQuantity) || input.newQuantity < 0) {
    throw new Error("Saldo final deve ser um numero inteiro maior ou igual a zero.");
  }

  if (!input.reason?.trim()) {
    throw new Error("Ajuste exige justificativa.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.affectedLocationId);

    const before = await getBalanceQuantity(
      tx,
      input.productId,
      input.affectedLocationId
    );
    const delta = input.newQuantity - before;

    if (delta === 0) {
      throw new Error("Ajuste sem alteracao de saldo.");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: input.inventoryAuditId
          ? MovementType.INVENTORY
          : MovementType.ADJUSTMENT,
        quantity: Math.abs(delta),
        affectedLocationId: input.affectedLocationId,
        inventoryAuditId: input.inventoryAuditId ?? null,
        notes: input.notes ?? null,
        reason: input.reason,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.affectedLocationId,
      input.newQuantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.affectedLocationId,
      quantityBefore: before,
      quantityDelta: delta
    });

    if (input.inventoryAuditId) {
      await tx.inventoryAudit.update({
        where: { id: input.inventoryAuditId },
        data: { status: AuditStatus.ADJUSTED }
      });
    }

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function createLoss(input: LossInput) {
  assertPositiveQuantity(input.quantity);

  if (!input.reason?.trim()) {
    throw new Error("Perda ou avaria exige justificativa.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.affectedLocationId);

    const before = await getBalanceQuantity(
      tx,
      input.productId,
      input.affectedLocationId
    );

    if (before < input.quantity) {
      throw new Error("Saldo insuficiente no local afetado.");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: MovementType.LOSS,
        quantity: input.quantity,
        affectedLocationId: input.affectedLocationId,
        notes: input.notes ?? null,
        reason: input.reason,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.affectedLocationId,
      before - input.quantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.affectedLocationId,
      quantityBefore: before,
      quantityDelta: -input.quantity
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function reverseMovement(input: ReversalInput) {
  if (!input.reason.trim()) {
    throw new Error("Estorno exige justificativa.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    const original = await tx.stockMovement.findUnique({
      where: { id: input.movementId },
      include: { lines: true }
    });

    if (!original) {
      throw new Error("Movimentacao original nao encontrada.");
    }

    if (original.status !== MovementStatus.ACTIVE) {
      throw new Error("Movimentacao original ja foi estornada.");
    }

    if (original.movementType === MovementType.REVERSAL) {
      throw new Error("Estorno de estorno nao e permitido no MVP.");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: original.productId,
        movementType: MovementType.REVERSAL,
        quantity: original.quantity,
        sourceLocationId: original.destinationLocationId,
        destinationLocationId: original.sourceLocationId,
        affectedLocationId: original.affectedLocationId,
        reason: input.reason,
        notes: input.notes ?? null,
        userId: input.userId,
        reversedMovementId: original.id,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    for (const line of original.lines) {
      const before = await getBalanceQuantity(
        tx,
        line.productId,
        line.storageLocationId
      );
      const inverseDelta = -line.quantityDelta;

      if (before + inverseDelta < 0) {
        throw new Error("Estorno deixaria saldo negativo.");
      }

      await setBalanceQuantity(
        tx,
        line.productId,
        line.storageLocationId,
        before + inverseDelta
      );

      await createLine(tx, {
        stockMovementId: movement.id,
        productId: line.productId,
        storageLocationId: line.storageLocationId,
        quantityBefore: before,
        quantityDelta: inverseDelta
      });
    }

    await tx.stockMovement.update({
      where: { id: original.id },
      data: { status: MovementStatus.REVERSED }
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}
