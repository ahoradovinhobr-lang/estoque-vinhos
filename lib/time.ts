export const DEFAULT_TIMEZONE =
  process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

export function nowUtc(): Date {
  return new Date();
}

export function parseOccurredAt(value?: Date | string | null): Date {
  if (!value) {
    return nowUtc();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de movimentacao invalida.");
  }

  return date;
}
