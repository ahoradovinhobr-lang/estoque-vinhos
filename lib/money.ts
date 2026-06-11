import { Prisma } from "@prisma/client";

type MoneyValue = Prisma.Decimal | number | string | null | undefined;

function normalizeMoneyText(text: string): string | null {
  const value = text
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s+/g, "");

  if (!value || value.startsWith("-") || !/^\d[\d.,]*$/.test(value)) {
    return null;
  }

  const separatorMatches = value.match(/[.,]/g) ?? [];
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  const decimalSeparator =
    lastComma > lastDot ? "," : lastDot > -1 ? "." : null;

  if (!decimalSeparator) {
    return `${value}.00`;
  }

  const separatorIndex = Math.max(lastComma, lastDot);
  const integerPart = value.slice(0, separatorIndex);
  const fractionalPart = value.slice(separatorIndex + 1);
  const looksLikeThousands =
    separatorMatches.length > 1 || fractionalPart.length === 3;

  if (looksLikeThousands && fractionalPart.length === 3) {
    return `${value.replace(/[.,]/g, "")}.00`;
  }

  if (fractionalPart.length === 0 || fractionalPart.length > 2) {
    return null;
  }

  const digits = integerPart.replace(/[.,]/g, "");

  if (!digits || !/^\d+$/.test(digits) || !/^\d+$/.test(fractionalPart)) {
    return null;
  }

  return `${digits}.${fractionalPart.padEnd(2, "0")}`;
}

export function parseMoneyInput(
  input: FormDataEntryValue | string | null | undefined,
  label: string
): Prisma.Decimal | null {
  const text = String(input ?? "").trim();

  if (!text) {
    return null;
  }

  const normalized = normalizeMoneyText(text);

  if (!normalized) {
    throw new Error(`${label} deve ser um valor monetario valido.`);
  }

  const amount = new Prisma.Decimal(normalized);

  if (amount.isNegative()) {
    throw new Error(`${label} nao pode ser negativo.`);
  }

  return amount.toDecimalPlaces(2);
}

export function formatCurrency(value: MoneyValue): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value.toString()));
}

export function moneyToNumber(value: MoneyValue): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value.toString());
}
