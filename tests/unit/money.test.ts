import { describe, expect, it } from "vitest";

import { formatCurrency, moneyToNumber, parseMoneyInput } from "@/lib/money";

describe("parseMoneyInput", () => {
  it("accepts Brazilian decimal format", () => {
    expect(parseMoneyInput("1.234,56", "Valor")?.toString()).toBe("1234.56");
  });

  it("accepts plain decimal format", () => {
    expect(parseMoneyInput("79.90", "Valor")?.toString()).toBe("79.9");
  });

  it("accepts thousands-only values", () => {
    expect(parseMoneyInput("1.234", "Valor")?.toString()).toBe("1234");
  });

  it("rejects invalid money", () => {
    expect(() => parseMoneyInput("12,3456", "Valor")).toThrow(
      "Valor deve ser um valor monetario valido."
    );
  });
});

describe("formatCurrency", () => {
  it("formats currency in BRL", () => {
    const formatted = formatCurrency("79.9");

    expect(formatted).toContain("R$");
    expect(formatted).toContain("79,90");
  });
});

describe("moneyToNumber", () => {
  it("returns zero for empty values", () => {
    expect(moneyToNumber(null)).toBe(0);
  });
});
