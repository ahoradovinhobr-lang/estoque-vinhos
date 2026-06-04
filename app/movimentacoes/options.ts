import { MovementType, ProductType, WineColor } from "@prisma/client";

export const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

export const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
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

type ProductOption = {
  sku: string;
  name: string;
  type: ProductType;
  wineColor: WineColor;
  grape: string;
  vintage: string | null;
};

export function productOptionLabel(product: ProductOption): string {
  return [
    product.sku,
    product.name,
    productTypeLabels[product.type],
    wineColorLabels[product.wineColor],
    product.grape,
    product.vintage ? `Safra ${product.vintage}` : null
  ]
    .filter((item): item is string => Boolean(item))
    .join(" - ");
}
