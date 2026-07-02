import { Search, Wine } from "lucide-react";
import {
  ProductType,
  RecordStatus,
  WineColor,
  type Prisma
} from "@prisma/client";

import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { ProductPhoto } from "@/components/product/product-photo";
import { normalizeBarcode } from "@/services/barcode.service";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

const limitedProductInclude = {
  supplier: {
    select: {
      name: true
    }
  },
  balances: {
    select: {
      quantity: true
    }
  }
} satisfies Prisma.ProductInclude;

type LimitedProduct = Prisma.ProductGetPayload<{
  include: typeof limitedProductInclude;
}>;

function totalStock(product: LimitedProduct): number {
  return product.balances.reduce((sum, balance) => sum + balance.quantity, 0);
}

function looksLikeBarcode(value: string): boolean {
  return /^\d{6,}$/.test(value);
}

function availabilityClassName(available: boolean): string {
  return available
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-stone-200 bg-stone-100 text-stone-700";
}

function productCharacteristics(product: LimitedProduct): string {
  return [
    productTypeLabels[product.type],
    wineColorLabels[product.wineColor],
    `Uva ${product.grape}`,
    product.country,
    product.vintage ? `Safra ${product.vintage}` : null,
    product.supplier?.name
  ]
    .filter((item): item is string => Boolean(item))
    .join(" - ");
}

async function searchLimitedProducts(query: string): Promise<LimitedProduct[]> {
  if (!query) {
    return [];
  }

  const barcode = normalizeBarcode(query);
  const searchFilter: Prisma.ProductWhereInput = looksLikeBarcode(barcode)
    ? {
        OR: [
          { barcode },
          { name: { contains: query, mode: "insensitive" } }
        ]
      }
    : {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { grape: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
          { vintage: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
          {
            supplier: {
              is: {
                name: { contains: query, mode: "insensitive" }
              }
            }
          }
        ]
      };

  return prisma.product.findMany({
    where: {
      status: RecordStatus.ACTIVE,
      ...searchFilter
    },
    include: limitedProductInclude,
    orderBy: [{ name: "asc" }, { vintage: "desc" }],
    take: 24
  });
}

export async function LimitedConsultation({
  code,
  query
}: {
  code?: string;
  query?: string;
}) {
  const searchValue = normalizeBarcode(code ?? "") || String(query ?? "").trim();
  const products = await searchLimitedProducts(searchValue);

  return (
    <>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">A Hora do Vinho</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Consulta de vinhos
        </h1>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <form action="/busca" className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Busca
            </span>
            <input
              name="q"
              defaultValue={searchValue}
              type="search"
              autoComplete="off"
              placeholder="Nome, uva, pais, fornecedor ou codigo"
              className="h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end">
            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark lg:w-auto">
              <Search aria-hidden className="h-4 w-4" />
              Consultar
            </button>
          </div>
        </form>
      </section>

      {!searchValue ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Digite nome, uva, pais, fornecedor ou codigo para consultar.
        </section>
      ) : products.length === 0 ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white p-5">
          <p className="text-sm font-medium text-cellar">Sem resultado</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Nenhum vinho encontrado
          </h2>
          <p className="mt-1 text-sm text-stone-500">{searchValue}</p>
        </section>
      ) : (
        <section className="mt-6 space-y-3">
          <div className="rounded-md border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-ink">
              {products.length} vinho(s) encontrado(s)
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {products.map((product) => {
              const available = totalStock(product) > 0;

              return (
                <article
                  key={product.id}
                  className="rounded-md border border-stone-200 bg-white p-3 sm:p-4"
                >
                  <div className="grid grid-cols-[6rem_1fr] gap-3 sm:grid-cols-[7rem_1fr]">
                    <ProductPhoto
                      src={product.photoUrl}
                      alt={product.name}
                      className="h-32 w-24 sm:h-36 sm:w-28"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col items-start gap-2">
                        <h2 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                          {product.name}
                        </h2>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${availabilityClassName(
                            available
                          )}`}
                        >
                          {available ? "Disponivel" : "Sob consulta"}
                        </span>
                      </div>
                      <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-stone-600">
                        <Wine
                          aria-hidden
                          className="mt-0.5 h-4 w-4 shrink-0 text-cellar"
                        />
                        <span className="min-w-0">
                          {productCharacteristics(product)}
                        </span>
                      </p>
                      <p className="mt-3 text-base font-semibold text-cellar">
                        {product.salePrice
                          ? formatCurrency(product.salePrice)
                          : "Preco sob consulta"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
