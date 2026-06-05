import Link from "next/link";
import { Barcode, Boxes, Search } from "lucide-react";
import { ProductType, RecordStatus, WineColor } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const products = query
    ? await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { grape: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } }
          ]
        },
        include: {
          supplier: true,
          balances: {
            include: {
              storageLocation: true
            }
          }
        },
        orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }],
        take: 30
      })
    : [];

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Busca rapida</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Localizar vinho no estoque
        </h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <form action="/busca" className="block">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-stone-700"
          >
            Nome, SKU, uva ou codigo de barras
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              />
              <input
                id="search"
                name="q"
                autoFocus
                defaultValue={query}
                placeholder="Escaneie ou digite para buscar"
                className="h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
              <Barcode aria-hidden className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </form>
      </section>

      {!query ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Digite ou escaneie para localizar quantidade total e locais de armazenamento.
        </section>
      ) : products.length === 0 ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Nenhum produto encontrado para &quot;{query}&quot;.
        </section>
      ) : (
        <section className="mt-6 space-y-3">
          {products.map((product) => {
            const balancesWithStock = product.balances
              .filter((balance) => balance.quantity > 0)
              .sort((first, second) =>
                first.storageLocation.code.localeCompare(
                  second.storageLocation.code
                )
              );
            const totalStock = balancesWithStock.reduce(
              (sum, balance) => sum + balance.quantity,
              0
            );
            const characteristics = [
              productTypeLabels[product.type],
              wineColorLabels[product.wineColor],
              `Uva ${product.grape}`,
              product.country,
              product.vintage ? `Safra ${product.vintage}` : null,
              product.supplier?.name
            ]
              .filter((item): item is string => Boolean(item))
              .join(" - ");

            return (
              <article
                key={product.id}
                className="rounded-md border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">
                        {product.name}
                      </h3>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                        {product.status === RecordStatus.ACTIVE
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {characteristics}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      SKU {product.sku}
                      {product.barcode ? ` - Barcode ${product.barcode}` : ""}
                    </p>
                  </div>
                  <div className="rounded-md border border-stone-200 px-4 py-3 text-right">
                    <p className="text-xs font-medium uppercase tracking-normal text-stone-500">
                      Saldo total
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink">
                      {totalStock}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Boxes aria-hidden className="h-4 w-4 text-cellar" />
                      Locais com saldo
                    </p>
                    {balancesWithStock.length === 0 ? (
                      <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
                        Nenhuma unidade em local de estoque.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {balancesWithStock.map((balance) => (
                          <div
                            key={balance.id}
                            className="rounded-md border border-stone-200 px-3 py-2"
                          >
                            <p className="font-medium text-ink">
                              {balance.storageLocation.code}
                            </p>
                            <p className="text-sm text-stone-500">
                              {balance.storageLocation.name}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-cellar">
                              {balance.quantity} unidades
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid min-w-44 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <Link
                      href={`/movimentacoes/entrada?productId=${product.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-cellar px-3 text-sm font-semibold text-white hover:bg-[#4f2733]"
                    >
                      Entrada
                    </Link>
                    <Link
                      href={`/movimentacoes/saida?productId=${product.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Saida
                    </Link>
                    <Link
                      href={`/movimentacoes/transferencia?productId=${product.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Transferir
                    </Link>
                    <Link
                      href={`/movimentacoes/ajuste?productId=${product.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Ajustar
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
