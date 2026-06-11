export type GtinLookupStatus = "found" | "not_found" | "invalid" | "error";

export type GtinLookupResult = {
  gtin: string;
  status: GtinLookupStatus;
  provider: string;
  sourceUrl: string | null;
  name: string | null;
  brand: string | null;
  country: string | null;
  imageUrl: string | null;
  message: string | null;
};

type JsonRecord = Record<string, unknown>;

const validGtinLengths = new Set([8, 12, 13, 14]);
const defaultLookupTimeoutMs = 8000;

export function normalizeGtin(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function isValidGtin(value: string): boolean {
  const gtin = normalizeGtin(value);

  if (!/^\d+$/.test(gtin) || !validGtinLengths.has(gtin.length)) {
    return false;
  }

  const digits = gtin.split("").map(Number);
  const checkDigit = digits.pop();

  if (checkDigit === undefined) {
    return false;
  }

  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expectedCheckDigit = (10 - (sum % 10)) % 10;

  return checkDigit === expectedCheckDigit;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = stringValue(value);

    if (text) {
      return text;
    }
  }

  return null;
}

function openFoodFactsUrls(gtin: string): string[] {
  const encodedGtin = encodeURIComponent(gtin);

  return [
    `https://world.openfoodfacts.org/api/v3.6/product/${encodedGtin}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${encodedGtin}.json`
  ];
}

function configuredProviderUrls(gtin: string): string[] {
  const template = process.env.GTIN_LOOKUP_API_URL?.trim();

  if (!template) {
    return openFoodFactsUrls(gtin);
  }

  if (template.includes("{gtin}")) {
    return [template.replaceAll("{gtin}", encodeURIComponent(gtin))];
  }

  return [`${template.replace(/\/+$/, "")}/${encodeURIComponent(gtin)}`];
}

function providerName(): string {
  return process.env.GTIN_LOOKUP_PROVIDER?.trim() || "Open Food Facts";
}

function lookupTimeoutMs(): number {
  const timeout = Number(process.env.GTIN_LOOKUP_TIMEOUT_MS);

  return Number.isFinite(timeout) && timeout > 0
    ? timeout
    : defaultLookupTimeoutMs;
}

function connectionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Consulta GTIN excedeu o tempo limite. Tente novamente.";
  }

  return "Nao foi possivel conectar ao provedor GTIN. Tente novamente ou cadastre manualmente.";
}

function normalizeProviderResult(
  gtin: string,
  provider: string,
  sourceUrl: string,
  data: unknown
): GtinLookupResult {
  const root = recordValue(data) ?? {};
  const product = recordValue(root.product) ?? recordValue(root.data) ?? root;
  const status = root.status;
  const statusVerbose = stringValue(root.status_verbose);
  const name = firstString(
    product.product_name_pt,
    product.product_name,
    product.name,
    product.description,
    product.nome
  );
  const found =
    status === "success" ||
    status === 1 ||
    status === "1" ||
    Boolean(recordValue(root.product)) ||
    Boolean(name);

  if (!found) {
    return {
      gtin,
      status: "not_found",
      provider,
      sourceUrl,
      name: null,
      brand: null,
      country: null,
      imageUrl: null,
      message: statusVerbose || "Produto nao encontrado no provedor GTIN."
    };
  }

  return {
    gtin,
    status: "found",
    provider,
    sourceUrl,
    name,
    brand: firstString(product.brands, product.brand, product.marca),
    country: firstString(product.countries, product.country, product.pais),
    imageUrl: firstString(
      product.image_front_url,
      product.image_url,
      product.imageUrl,
      product.imagem
    ),
    message: null
  };
}

export async function lookupGtin(gtinInput: string): Promise<GtinLookupResult> {
  const gtin = normalizeGtin(gtinInput);
  const provider = providerName();

  if (!isValidGtin(gtin)) {
    return {
      gtin,
      status: "invalid",
      provider,
      sourceUrl: null,
      name: null,
      brand: null,
      country: null,
      imageUrl: null,
      message: "GTIN invalido. Informe um EAN/GTIN numerico com digito verificador valido."
    };
  }

  const apiKey = process.env.GTIN_LOOKUP_API_KEY?.trim();
  const urls = configuredProviderUrls(gtin);
  let notFoundResult: GtinLookupResult | null = null;
  let lastSourceUrl: string | null = null;
  let lastErrorMessage =
    "Falha ao consultar provedor GTIN. Tente novamente ou cadastre manualmente.";

  for (const sourceUrl of urls) {
    lastSourceUrl = sourceUrl;

    try {
      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        lookupTimeoutMs()
      );

      const response = await fetch(sourceUrl, {
        cache: "no-store",
        signal: abortController.signal,
        headers: {
          Accept: "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "User-Agent":
            process.env.GTIN_LOOKUP_USER_AGENT ||
            "EstoqueVinhos/0.1 (https://estoque-vinhos-production.up.railway.app)"
        }
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const status = response.status === 404 ? "not_found" : "error";
        const result: GtinLookupResult = {
          gtin,
          status,
          provider,
          sourceUrl,
          name: null,
          brand: null,
          country: null,
          imageUrl: null,
          message:
            status === "not_found"
              ? "Produto nao encontrado no provedor GTIN."
              : `Provedor GTIN respondeu HTTP ${response.status}.`
        };

        if (status === "not_found") {
          notFoundResult = result;
          continue;
        }

        lastErrorMessage = result.message ?? lastErrorMessage;
        continue;
      }

      return normalizeProviderResult(gtin, provider, sourceUrl, await response.json());
    } catch (error) {
      lastErrorMessage = connectionErrorMessage(error);
    }
  }

  if (notFoundResult) {
    return notFoundResult;
  }

  return {
    gtin,
    status: "error",
    provider,
    sourceUrl: lastSourceUrl,
    name: null,
    brand: null,
    country: null,
    imageUrl: null,
    message: lastErrorMessage
  };
}
