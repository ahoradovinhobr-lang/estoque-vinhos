import Link from "next/link";
import { BarChart3, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import {
  productStatusLabels,
  productTypeLabels,
  wineColorLabels
} from "../report-options";

type CurrentStockReportPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CurrentStockReportPage({
  searchParams
}: CurrentStockReportPageProps) {
  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const products = await prisma.product.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { grape: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: {
      supplier: true,
      balances: {
        include: {
          storageLocation: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }]
  });

  const rows = products.map((product) => {
    const balancesWithStock = product.balances
      .filter((balance) => balance.quantity > 0)
      .sort((first, second) =>
        first.storageLocation.code.localeCompare(second.storageLocation.code)
      );
    const totalStock = balancesWithStock.reduce(
      (sum, balance) => sum + balance.quantity,
      0
    );

    return {
      product,
      balancesWithStock,
      totalStock
    };
  });
  const totalUnits = rows.reduce((sum, row) => sum + row.totalStock, 0);
  const productsWithStock = rows.filter((row) => row.totalStock > 0).length;

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Relatorios</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Estoque atual
          </h2>
        </div>
        <Link
          href="/relatorios"
          className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Voltar
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Unidades</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{totalUnits}</p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Produtos com saldo</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {productsWithStock}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Produtos listados</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{rows.length}</p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <form action="/relatorios/estoque-atual" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            />
            <input
              name="q"
              defaultValue={query}
              placeholder="Nome, SKU, uva ou codigo de barras"
              className="h-10 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
            <BarChart3 aria-hidden className="h-4 w-4" />
            Filtrar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Caracteristicas</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Locais</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={6}
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                rows.map(({ product, balancesWithStock, totalStock }) => {
                  const characteristics = [
                    productTypeLabels[product.type],
                    wineColorLabels[product.wineColor],
                    product.grape,
                    product.country,
                    product.vintage ? `Safra ${product.vintage}` : null
                  ]
                    .filter((item): item is string => Boolean(item))
                    .join(" - ");
                  const locations =
                    balancesWithStock.length === 0
                      ? "-"
                      : balancesWithStock
                          .map(
                            (balance) =>
                              `${balance.storageLocation.code}: ${balance.quantity}`
                          )
                          .join(" | ");

                  return (
                    <tr key={product.id} className="border-b border-stone-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{product.name}</p>
                        <p className="text-stone-500">
                          SKU {product.sku}
                          {product.barcode ? ` - Barcode ${product.barcode}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {characteristics}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {product.supplier?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {totalStock}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{locations}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {productStatusLabels[product.status]}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
