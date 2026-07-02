import { Prisma, RecordStatus } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function assertActiveProduct(tx: Tx, productId: string) {
  const product = await tx.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  if (product.status !== RecordStatus.ACTIVE) {
    throw new Error("Produto inativo nao pode ser movimentado.");
  }

  return product;
}

export async function assertActiveLocation(tx: Tx, locationId: string) {
  const location = await tx.storageLocation.findUnique({
    where: { id: locationId }
  });

  if (!location) {
    throw new Error("Local de armazenamento nao encontrado.");
  }

  if (location.status !== RecordStatus.ACTIVE) {
    throw new Error("Local inativo nao pode receber movimentacao.");
  }

  return location;
}

export function assertPositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantidade deve ser um numero inteiro maior que zero.");
  }
}

export async function getBalanceQuantity(
  tx: Tx,
  productId: string,
  storageLocationId: string
): Promise<number> {
  const balance = await tx.inventoryBalance.findUnique({
    where: {
      productId_storageLocationId: {
        productId,
        storageLocationId
      }
    }
  });

  return balance?.quantity ?? 0;
}

export async function setBalanceQuantity(
  tx: Tx,
  productId: string,
  storageLocationId: string,
  quantity: number
) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Saldo final nao pode ser negativo.");
  }

  return tx.inventoryBalance.upsert({
    where: {
      productId_storageLocationId: {
        productId,
        storageLocationId
      }
    },
    create: {
      productId,
      storageLocationId,
      quantity
    },
    update: {
      quantity
    }
  });
}

export async function ensureNoProductBalance(
  tx: Tx,
  productId: string
): Promise<void> {
  const balance = await tx.inventoryBalance.aggregate({
    where: { productId },
    _sum: { quantity: true }
  });

  if ((balance._sum.quantity ?? 0) > 0) {
    throw new Error("Produto com saldo positivo nao pode ser inativado.");
  }
}

export async function ensureProductHasNoOperationalHistory(
  tx: Tx,
  productId: string
): Promise<void> {
  const [balances, movements, movementLines, inventoryAudits] =
    await Promise.all([
      tx.inventoryBalance.count({ where: { productId } }),
      tx.stockMovement.count({ where: { productId } }),
      tx.stockMovementLine.count({ where: { productId } }),
      tx.inventoryAudit.count({ where: { productId } })
    ]);

  if (balances + movements + movementLines + inventoryAudits > 0) {
    throw new Error(
      "Produto com saldo, movimentacao ou inventario nao pode ser excluido. Inative o produto para preservar o historico."
    );
  }
}

export async function ensureNoLocationBalance(
  tx: Tx,
  storageLocationId: string
): Promise<void> {
  const balance = await tx.inventoryBalance.aggregate({
    where: { storageLocationId },
    _sum: { quantity: true }
  });

  if ((balance._sum.quantity ?? 0) > 0) {
    throw new Error("Local com saldo positivo nao pode ser inativado.");
  }
}
