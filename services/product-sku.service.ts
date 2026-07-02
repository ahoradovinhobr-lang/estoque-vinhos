import { randomUUID } from "crypto";

export function generatedInternalSku(): string {
  return `AUTO-${randomUUID()}`;
}
