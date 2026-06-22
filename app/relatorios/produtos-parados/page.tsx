import Link from "next/link";
import { Filter, PackageSearch } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  formatDateTime,
  productTypeLabels,
  wineColorLabels
} from "../report-options";

type StaleProductsReportPageProps = {
  searchParams?: Promise<{
    days?: string;
  }>;
};

const periodOptions = [30, 60, 90, 120];

export const dynamic = "force-dynamic";

export default async function StaleProductsReportPage({
  searchParams
}: StaleProductsReportPageProps) {
  await requirePagePermission("reports:read");

  const params = await searchParams;
  const requestedDays = Number(params?.days ?? 90);
  const days = periodOptions.includes(requestedDays) ? requestedDays : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { lt: since },
      movements: {
        none: {
          createdAt: { gte: since }
        }
      }
    },
    include: {
      supplier: true,
      balances: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { name: "asc" }
  });

  const rows = products.map((product) => ({
    product,
    totalStock: product.balances.reduce(
      (sum, balance) => sum + balance.quantity,
      0
    ),
    lastMovement: product.movements[0] ?? null
  }));
  const unitsStopped = rows.reduce((sum, row) => sum + row.totalStock, 0);
  const withStock = rows.filter((row) => row.totalStock > 0).length;

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Relatorios</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Produtos parados
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
          <p className="text-sm text-stone-600">Produtos parados</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {rows.length}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Com saldo positivo</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{withStock}</p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Unidades paradas</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {unitsStopped}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <form action="/relatorios/produtos-parados" className="flex flex-col gap-3 sm:flex-row">
          <select
            name="days"
            defaultValue={String(days)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          >
            {periodOptions.map((option) => (
              <option key={option} value={option}>
                Sem movimentacao ha {option} dias
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark">
            <Filter aria-hidden className="h-4 w-4" />
            Filtrar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <PackageSearch aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Produtos sem movimentacao no periodo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Caracteristicas</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 text-right font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Ultima movimentacao</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={6}
                  >
                    Nenhum produto parado neste periodo.
                  </td>
                </tr>
              ) : (
                rows.map(({ product, totalStock, lastMovement }) => {
                  const characteristics = [
                    productTypeLabels[product.type],
                    wineColorLabels[product.wineColor],
                    product.grape,
                    product.vintage ? `Safra ${product.vintage}` : null
                  ]
                    .filter((item): item is string => Boolean(item))
                    .join(" - ");

                  return (
                    <tr key={product.id} className="border-b border-stone-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{product.name}</p>
                        <p className="text-stone-500">SKU {product.sku}</p>
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
                      <td className="px-4 py-3 text-stone-600">
                        {lastMovement
                          ? formatDateTime(lastMovement.createdAt)
                          : "Sem movimentacao"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDateTime(product.createdAt)}
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
