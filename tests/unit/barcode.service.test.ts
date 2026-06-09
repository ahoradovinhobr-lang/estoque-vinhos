import { describe, expect, it } from "vitest";

import { normalizeBarcode } from "@/services/barcode.service";

describe("normalizeBarcode", () => {
  it("remove surrounding and internal whitespace", () => {
    expect(normalizeBarcode(" 789 123\t456\n7890 ")).toBe("7891234567890");
  });

  it("keeps non-whitespace characters unchanged", () => {
    expect(normalizeBarcode("ABC-123")).toBe("ABC-123");
  });
});
