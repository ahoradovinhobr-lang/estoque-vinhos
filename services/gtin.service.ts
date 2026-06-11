export type GtinLookupStatus = "found" | "not_found" | "invalid" | "error";
export type GtinLookupProductType = "WINE" | "SPARKLING";
export type GtinLookupWineColor = "RED" | "WHITE" | "ROSE";

export type GtinLookupResult = {
  gtin: string;
  status: GtinLookupStatus;
  provider: string;
  sourceUrl: string | null;
  name: string | null;
  brand: string | null;
  country: string | null;
  imageUrl: string | null;
  productType: GtinLookupProductType | null;
  wineColor: GtinLookupWineColor | null;
  grape: string | null;
  vintage: string | null;
  message: string | null;
};

type JsonRecord = Record<string, unknown>;

const validGtinLengths = new Set([8, 12, 13, 14]);
const defaultLookupTimeoutMs = 8000;

const countryLabels: Record<string, string> = {
  argentina: "Argentina",
  australia: "Australia",
  austria: "Austria",
  brazil: "Brasil",
  brasil: "Brasil",
  chile: "Chile",
  france: "Franca",
  germany: "Alemanha",
  italy: "Italia",
  newzealand: "Nova Zelandia",
  portugal: "Portugal",
  southafrica: "Africa do Sul",
  spain: "Espanha",
  unitedstates: "Estados Unidos",
  uruguay: "Uruguai"
};

const grapeCandidates = [
  { label: "Cabernet Sauvignon", aliases: ["cabernet sauvignon"] },
  { label: "Sauvignon Blanc", aliases: ["sauvignon blanc"] },
  { label: "Cabernet Franc", aliases: ["cabernet franc"] },
  { label: "Pinot Noir", aliases: ["pinot noir", "pinot nero"] },
  { label: "Pinot Grigio", aliases: ["pinot grigio"] },
  { label: "Pinot Gris", aliases: ["pinot gris"] },
  { label: "Pinot Meunier", aliases: ["pinot meunier"] },
  { label: "Pinot Blanc", aliases: ["pinot blanc", "pinot bianco"] },
  { label: "Chenin Blanc", aliases: ["chenin blanc"] },
  { label: "Gewurztraminer", aliases: ["gewurztraminer"] },
  { label: "Touriga Nacional", aliases: ["touriga nacional"] },
  { label: "Alicante Bouschet", aliases: ["alicante bouschet"] },
  { label: "Petit Verdot", aliases: ["petit verdot"] },
  { label: "Nero d'Avola", aliases: ["nero d avola", "nero d'avola"] },
  { label: "Montepulciano", aliases: ["montepulciano"] },
  { label: "Tempranillo", aliases: ["tempranillo", "tinta roriz", "aragonez"] },
  { label: "Sangiovese", aliases: ["sangiovese"] },
  { label: "Chardonnay", aliases: ["chardonnay"] },
  { label: "Carmenere", aliases: ["carmenere"] },
  { label: "Riesling", aliases: ["riesling"] },
  { label: "Primitivo", aliases: ["primitivo"] },
  { label: "Zinfandel", aliases: ["zinfandel"] },
  { label: "Nebbiolo", aliases: ["nebbiolo"] },
  { label: "Torrontes", aliases: ["torrontes"] },
  { label: "Vermentino", aliases: ["vermentino"] },
  { label: "Trebbiano", aliases: ["trebbiano"] },
  { label: "Viognier", aliases: ["viognier"] },
  { label: "Alvarinho", aliases: ["alvarinho", "albarino"] },
  { label: "Loureiro", aliases: ["loureiro"] },
  { label: "Marselan", aliases: ["marselan"] },
  { label: "Moscato", aliases: ["moscato", "muscat"] },
  { label: "Semillon", aliases: ["semillon"] },
  { label: "Verdejo", aliases: ["verdejo"] },
  { label: "Grenache", aliases: ["grenache", "garnacha"] },
  { label: "Mourvedre", aliases: ["mourvedre", "monastrell"] },
  { label: "Carignan", aliases: ["carignan", "carignano"] },
  { label: "Barbera", aliases: ["barbera"] },
  { label: "Corvina", aliases: ["corvina"] },
  { label: "Malbec", aliases: ["malbec"] },
  { label: "Merlot", aliases: ["merlot"] },
  { label: "Shiraz", aliases: ["shiraz"] },
  { label: "Syrah", aliases: ["syrah"] },
  { label: "Tannat", aliases: ["tannat"] },
  { label: "Gamay", aliases: ["gamay"] },
  { label: "Glera", aliases: ["glera"] },
  { label: "Arinto", aliases: ["arinto"] },
  { label: "Baga", aliases: ["baga"] }
];

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

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const text = stringValue(item);

      return text ? [text] : [];
    });
  }

  const text = stringValue(value);

  return text ? [text] : [];
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasTerm(searchText: string, term: string): boolean {
  const normalizedTerm = normalizeSearchText(term);

  return new RegExp(`(^| )${normalizedTerm.replaceAll(" ", " +")}( |$)`).test(
    searchText
  );
}

function searchableProviderText(product: JsonRecord): string {
  return [
    ...stringValues(product.product_name_pt),
    ...stringValues(product.product_name),
    ...stringValues(product.product_name_en),
    ...stringValues(product.product_name_es),
    ...stringValues(product.product_name_fr),
    ...stringValues(product.product_name_it),
    ...stringValues(product.generic_name_pt),
    ...stringValues(product.generic_name),
    ...stringValues(product.abbreviated_product_name),
    ...stringValues(product.brands),
    ...stringValues(product.categories),
    ...stringValues(product.categories_tags),
    ...stringValues(product.labels),
    ...stringValues(product.labels_tags),
    ...stringValues(product.ingredients_text_pt),
    ...stringValues(product.ingredients_text)
  ]
    .map(normalizeSearchText)
    .join(" ");
}

function inferProductType(searchText: string): GtinLookupProductType | null {
  const sparklingTerms = [
    "sparkling wine",
    "sparkling wines",
    "vinho espumante",
    "espumante",
    "champagne",
    "prosecco",
    "cava",
    "cremant",
    "spumante",
    "brut"
  ];

  if (sparklingTerms.some((term) => hasTerm(searchText, term))) {
    return "SPARKLING";
  }

  const wineTerms = ["wine", "wines", "vinho", "vinhos", "vino", "vinos", "vin"];

  return wineTerms.some((term) => hasTerm(searchText, term)) ? "WINE" : null;
}

function inferWineColor(searchText: string): GtinLookupWineColor | null {
  const colorTerms: Array<{
    color: GtinLookupWineColor;
    terms: string[];
  }> = [
    { color: "ROSE", terms: ["rose", "rose wine", "rose wines", "rosado", "rosato"] },
    {
      color: "WHITE",
      terms: ["white wine", "white wines", "vinho branco", "branco", "blanc", "blanco", "bianco"]
    },
    {
      color: "RED",
      terms: ["red wine", "red wines", "vinho tinto", "tinto", "rouge", "rojo", "rosso"]
    }
  ];

  for (const item of colorTerms) {
    if (item.terms.some((term) => hasTerm(searchText, term))) {
      return item.color;
    }
  }

  return null;
}

function inferGrape(searchText: string): string | null {
  for (const candidate of grapeCandidates) {
    if (candidate.aliases.some((alias) => hasTerm(searchText, alias))) {
      return candidate.label;
    }
  }

  const blendTerms = ["blend", "assemblage", "corte"];

  return blendTerms.some((term) => hasTerm(searchText, term)) ? "Corte" : null;
}

function inferVintage(searchText: string): string | null {
  return searchText.match(/\b(19[5-9]\d|20[0-3]\d)\b/)?.[1] ?? null;
}

function countryFromValue(value: unknown): string | null {
  for (const candidate of stringValues(value)) {
    const parts = candidate.split(",");

    for (const part of parts) {
      const withoutPrefix = part.trim().replace(/^[a-z]{2}:/i, "");
      const normalized = normalizeSearchText(withoutPrefix).replace(/\s+/g, "");
      const mapped = countryLabels[normalized];

      if (mapped) {
        return mapped;
      }

      if (withoutPrefix && !withoutPrefix.includes(":")) {
        return withoutPrefix;
      }
    }
  }

  return null;
}

function providerCountry(product: JsonRecord): string | null {
  return (
    countryFromValue(product.countries_tags) ??
    countryFromValue(product.countries_hierarchy) ??
    countryFromValue(product.countries) ??
    countryFromValue(product.country) ??
    countryFromValue(product.pais)
  );
}

function providerHints(product: JsonRecord): Pick<
  GtinLookupResult,
  "productType" | "wineColor" | "grape" | "vintage"
> {
  const searchText = searchableProviderText(product);

  return {
    productType: inferProductType(searchText),
    wineColor: inferWineColor(searchText),
    grape: inferGrape(searchText),
    vintage: inferVintage(searchText)
  };
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
  const hints = providerHints(product);
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
      productType: null,
      wineColor: null,
      grape: null,
      vintage: null,
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
    country: providerCountry(product),
    imageUrl: firstString(
      product.image_front_url,
      product.image_url,
      product.imageUrl,
      product.imagem
    ),
    ...hints,
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
      productType: null,
      wineColor: null,
      grape: null,
      vintage: null,
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
          productType: null,
          wineColor: null,
          grape: null,
          vintage: null,
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
    productType: null,
    wineColor: null,
    grape: null,
    vintage: null,
    message: lastErrorMessage
  };
}
