import { afterEach, describe, expect, it, vi } from "vitest";

import { isValidGtin, lookupGtin, normalizeGtin } from "@/services/gtin.service";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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

describe("lookupGtin", () => {
  it("falls back to Open Food Facts v2 when the current endpoint fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        Response.json({
          status: "success",
          product: {
            product_name: "Produto teste",
            brands: "Marca teste",
            countries: "Brasil",
            image_url: "https://example.com/foto.jpg"
          }
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupGtin("4006381333931");

    expect(result).toMatchObject({
      status: "found",
      name: "Produto teste",
      brand: "Marca teste",
      country: "Brasil",
      imageUrl: "https://example.com/foto.jpg"
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v3.6/product/");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v2/product/");
  });

  it("returns a user-facing connection error after all providers fail", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupGtin("4006381333931");

    expect(result.status).toBe("error");
    expect(result.message).toContain("Nao foi possivel conectar");
    expect(result.message).not.toContain("fetch failed");
  });
});
