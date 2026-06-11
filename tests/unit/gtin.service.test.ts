import { describe, expect, it } from "vitest";

import { isValidGtin, normalizeGtin } from "@/services/gtin.service";

describe("normalizeGtin", () => {
  it("removes whitespace", () => {
    expect(normalizeGtin(" 400 638\t1333931 ")).toBe("4006381333931");
  });
});

describe("isValidGtin", () => {
  it("accepts valid GTIN values", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("036000291452")).toBe(true);
  });

  it("rejects invalid check digits", () => {
    expect(isValidGtin("4006381333932")).toBe(false);
  });

  it("rejects non numeric values", () => {
    expect(isValidGtin("ABC-123")).toBe(false);
  });
});
