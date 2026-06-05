import {
  AuditStatus,
  MovementStatus,
  MovementType,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";

export const auditStatusLabels: Record<AuditStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  ADJUSTED: "Ajustado",
  IGNORED: "Ignorado"
};

export const movementStatusLabels: Record<MovementStatus, string> = {
  ACTIVE: "Ativa",
  REVERSED: "Estornada"
};

export const movementTypeLabels: Record<MovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Saida",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventario",
  LOSS: "Perda/Avaria",
  REVERSAL: "Estorno"
};

export const productStatusLabels: Record<RecordStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo"
};

export const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

export const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

export function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  });
}
