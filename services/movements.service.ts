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

type SaleExitInput = {
  userId: string;
  channel: string;
  externalReference?: string | null;
  notes?: string | null;
  occurredAt?: Date | string | null;
  idempotencyKey?: string | null;
  items: Array<{
    productId: string;
    sourceLocationId: string;
    quantity: number;
  }>;
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

type InventoryAuditInput = MovementBaseInput & {
  storageLocationId: string;
  countedQuantity: number;
  applyAdjustment?: boolean;
};

type ApplyInventoryAuditInput = {
  inventoryAuditId: string;
  userId: string;
  reason: string;
  notes?: string | null;
  occurredAt?: Date | string | null;
  idempotencyKey?: string | null;
};

type IgnoreInventoryAuditInput = {
  inventoryAuditId: string;
  reason: string;
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

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} deve ser um numero inteiro maior ou igual a zero.`);
  }
}

function assertRequiredReason(reason: string | null | undefined, label: string) {
  if (!reason?.trim()) {
    throw new Error(`${label} exige justificativa.`);
  }
}

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

async function findExistingInventoryAuditByIdempotencyKey(
  tx: Tx,
  idempotencyKey?: string | null
) {
  if (!idempotencyKey) {
    return null;
  }

  return tx.inventoryAudit.findUnique({
    where: { idempotencyKey },
    include: {
      product: true,
      storageLocation: true,
      user: true,
      adjustmentMovement: { include: { lines: true } }
    }
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

export async function createSaleExit(input: SaleExitInput) {
  const channel = input.channel.trim();
  const externalReference = input.externalReference?.trim() || null;
  const saleKey = input.idempotencyKey?.trim() || null;
  const saleLabel = externalReference
    ? `${channel} ${externalReference}`
    : channel;
  const reason = `Venda - ${saleLabel}`;
  const notes = [saleKey ? `Venda agrupada: ${saleKey}` : null, input.notes]
    .filter((item): item is string => Boolean(item?.trim()))
    .join(" | ");

  if (!channel) {
    throw new Error("Canal da venda e obrigatorio.");
  }

  if (input.items.length === 0) {
    throw new Error("Informe ao menos um item para venda.");
  }

  const groupedItems = Array.from(
    input.items.reduce((items, item) => {
      assertPositiveQuantity(item.quantity);

      const key = `${item.productId}:${item.sourceLocationId}`;
      const existing = items.get(key);

      items.set(key, {
        productId: item.productId,
        sourceLocationId: item.sourceLocationId,
        quantity: (existing?.quantity ?? 0) + item.quantity
      });

      return items;
    }, new Map<string, { productId: string; sourceLocationId: string; quantity: number }>())
  ).map(([, item]) => item);

  return prisma.$transaction(async (tx) => {
    const movements = [];

    for (const [index, item] of groupedItems.entries()) {
      const itemIdempotencyKey = saleKey ? `${saleKey}:${index + 1}` : null;
      const existing = await findExistingByIdempotencyKey(
        tx,
        itemIdempotencyKey
      );
      if (existing) {
        movements.push(existing);
        continue;
      }

      await assertActiveProduct(tx, item.productId);
      await assertActiveLocation(tx, item.sourceLocationId);

      const before = await getBalanceQuantity(
        tx,
        item.productId,
        item.sourceLocationId
      );

      if (before < item.quantity) {
        throw new Error("Saldo insuficiente em um dos itens da venda.");
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.EXIT,
          quantity: item.quantity,
          sourceLocationId: item.sourceLocationId,
          notes: notes || null,
          reason,
          userId: input.userId,
          idempotencyKey: itemIdempotencyKey,
          occurredAt: parseOccurredAt(input.occurredAt)
        }
      });

      await setBalanceQuantity(
        tx,
        item.productId,
        item.sourceLocationId,
        before - item.quantity
      );

      await createLine(tx, {
        stockMovementId: movement.id,
        productId: item.productId,
        storageLocationId: item.sourceLocationId,
        quantityBefore: before,
        quantityDelta: -item.quantity
      });

      movements.push(
        await tx.stockMovement.findUniqueOrThrow({
          where: { id: movement.id },
          include: { lines: true }
        })
      );
    }

    return movements;
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

  assertRequiredReason(input.reason, "Perda ou avaria");

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

export async function createInventoryAudit(input: InventoryAuditInput) {
  assertNonNegativeInteger(input.countedQuantity, "Quantidade contada");

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingInventoryAuditByIdempotencyKey(
      tx,
      input.idempotencyKey
    );
    if (existing) return existing;

    await assertActiveProduct(tx, input.productId);
    await assertActiveLocation(tx, input.storageLocationId);

    const expectedQuantity = await getBalanceQuantity(
      tx,
      input.productId,
      input.storageLocationId
    );
    const difference = input.countedQuantity - expectedQuantity;
    const hasDivergence = difference !== 0;

    if (hasDivergence && input.applyAdjustment) {
      assertRequiredReason(input.reason, "Ajuste de inventario");
    }

    const audit = await tx.inventoryAudit.create({
      data: {
        productId: input.productId,
        storageLocationId: input.storageLocationId,
        expectedQuantity,
        countedQuantity: input.countedQuantity,
        difference,
        status: hasDivergence ? AuditStatus.PENDING : AuditStatus.CONFIRMED,
        idempotencyKey: input.idempotencyKey ?? null,
        notes: input.notes ?? null,
        userId: input.userId
      }
    });

    if (!hasDivergence || !input.applyAdjustment) {
      return tx.inventoryAudit.findUniqueOrThrow({
        where: { id: audit.id },
        include: {
          product: true,
          storageLocation: true,
          user: true,
          adjustmentMovement: { include: { lines: true } }
        }
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: MovementType.INVENTORY,
        quantity: Math.abs(difference),
        affectedLocationId: input.storageLocationId,
        inventoryAuditId: audit.id,
        reason: input.reason,
        notes: input.notes ?? null,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      input.productId,
      input.storageLocationId,
      input.countedQuantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: input.productId,
      storageLocationId: input.storageLocationId,
      quantityBefore: expectedQuantity,
      quantityDelta: difference
    });

    await tx.inventoryAudit.update({
      where: { id: audit.id },
      data: { status: AuditStatus.ADJUSTED }
    });

    return tx.inventoryAudit.findUniqueOrThrow({
      where: { id: audit.id },
      include: {
        product: true,
        storageLocation: true,
        user: true,
        adjustmentMovement: { include: { lines: true } }
      }
    });
  }, serializable);
}

export async function applyInventoryAudit(input: ApplyInventoryAuditInput) {
  assertRequiredReason(input.reason, "Ajuste de inventario");

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return existing;

    const audit = await tx.inventoryAudit.findUnique({
      where: { id: input.inventoryAuditId }
    });

    if (!audit) {
      throw new Error("Conferencia de inventario nao encontrada.");
    }

    if (audit.status !== AuditStatus.PENDING) {
      throw new Error("Somente divergencias pendentes podem ser ajustadas.");
    }

    if (audit.difference === 0) {
      await tx.inventoryAudit.update({
        where: { id: audit.id },
        data: { status: AuditStatus.CONFIRMED }
      });

      return null;
    }

    await assertActiveProduct(tx, audit.productId);
    await assertActiveLocation(tx, audit.storageLocationId);

    const currentQuantity = await getBalanceQuantity(
      tx,
      audit.productId,
      audit.storageLocationId
    );

    if (currentQuantity !== audit.expectedQuantity) {
      throw new Error(
        "Saldo atual mudou desde a conferencia. Faca uma nova conferencia antes de ajustar."
      );
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: audit.productId,
        movementType: MovementType.INVENTORY,
        quantity: Math.abs(audit.difference),
        affectedLocationId: audit.storageLocationId,
        inventoryAuditId: audit.id,
        reason: input.reason,
        notes: input.notes ?? audit.notes,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: parseOccurredAt(input.occurredAt)
      }
    });

    await setBalanceQuantity(
      tx,
      audit.productId,
      audit.storageLocationId,
      audit.countedQuantity
    );

    await createLine(tx, {
      stockMovementId: movement.id,
      productId: audit.productId,
      storageLocationId: audit.storageLocationId,
      quantityBefore: currentQuantity,
      quantityDelta: audit.difference
    });

    await tx.inventoryAudit.update({
      where: { id: audit.id },
      data: { status: AuditStatus.ADJUSTED }
    });

    return tx.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: { lines: true }
    });
  }, serializable);
}

export async function ignoreInventoryAudit(input: IgnoreInventoryAuditInput) {
  assertRequiredReason(input.reason, "Ignorar divergencia");

  return prisma.$transaction(async (tx) => {
    const audit = await tx.inventoryAudit.findUnique({
      where: { id: input.inventoryAuditId }
    });

    if (!audit) {
      throw new Error("Conferencia de inventario nao encontrada.");
    }

    if (audit.status !== AuditStatus.PENDING) {
      throw new Error("Somente divergencias pendentes podem ser ignoradas.");
    }

    const notes = [audit.notes, `Ignorado: ${input.reason}`]
      .filter((item): item is string => Boolean(item))
      .join("\n");

    return tx.inventoryAudit.update({
      where: { id: audit.id },
      data: {
        status: AuditStatus.IGNORED,
        notes
      }
    });
  }, serializable);
}

export async function reverseMovement(input: ReversalInput) {
  assertRequiredReason(input.reason, "Estorno");

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
