import { randomUUID } from "crypto";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import { registerInventoryAudit } from "../actions";

import { productOptionLabel } from "../../movimentacoes/options";

export const dynamic = "force-dynamic";

type NewInventoryAuditPageProps = {
  searchParams?: Promise<{
    productId?: string;
    locationId?: string;
  }>;
};

export default async function NewInventoryAuditPage({
  searchParams
}: NewInventoryAuditPageProps) {
  const params = await searchParams;
  const selectedProductId = String(params?.productId ?? "");
  const selectedLocationId = String(params?.locationId ?? "");

  const [products, locations, balances] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.storageLocation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" }
    }),
    prisma.inventoryBalance.findMany({
      where: { quantity: { gt: 0 } },
      include: {
        product: true,
        storageLocation: true
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);

  const sortedBalances = balances.sort((first, second) => {
    const productOrder = first.product.name.localeCompare(second.product.name);

    if (productOrder !== 0) {
      return productOrder;
    }

    return first.storageLocation.code.localeCompare(
      second.storageLocation.code
    );
  });

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Inventario</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Nova conferencia
        </h2>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <form
            action={registerInventoryAudit}
            className="grid gap-3 lg:grid-cols-6"
          >
            <input
              type="hidden"
              name="idempotencyKey"
              value={`inventory:${randomUUID()}`}
            />
            <label className="lg:col-span-4">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Produto
              </span>
              <select
                name="productId"
                required
                defaultValue={selectedProductId}
                className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productOptionLabel(product)}
                  </option>
                ))}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Local conferido
              </span>
              <select
                name="storageLocationId"
                required
                defaultValue={selectedLocationId}
                className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} - {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Quantidade contada
              </span>
              <input
                name="countedQuantity"
                type="number"
                min={0}
                step={1}
                required
                className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              />
            </label>
            <label className="flex h-10 items-center gap-2 self-end rounded-md border border-stone-300 px-3 text-sm text-stone-700 lg:col-span-2">
              <input
                name="applyAdjustment"
                type="checkbox"
                className="h-4 w-4 accent-cellar"
              />
              Aplicar ajuste
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Justificativa
              </span>
              <input
                name="reason"
                placeholder="obrigatoria para ajuste"
                className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              />
            </label>
            <label className="lg:col-span-4">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                Observacoes
              </span>
              <input
                name="notes"
                className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
              />
            </label>
            <div className="flex items-end gap-2 lg:col-span-2">
              <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
                <ClipboardCheck aria-hidden className="h-4 w-4" />
                Registrar
              </button>
              <Link
                href="/inventario"
                className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Voltar
              </Link>
            </div>
          </form>
        </div>

        <div className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h3 className="text-base font-semibold text-ink">
              Saldos atuais
            </h3>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 text-right font-medium">Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {sortedBalances.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-stone-500"
                      colSpan={3}
                    >
                      Nenhum saldo positivo registrado.
                    </td>
                  </tr>
                ) : (
                  sortedBalances.map((balance) => (
                    <tr key={balance.id} className="border-b border-stone-100">
                      <td className="px-4 py-3 font-medium text-ink">
                        {balance.product.name}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {balance.storageLocation.code}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {balance.quantity}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
