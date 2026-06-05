import { randomUUID } from "crypto";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { registerAdjustment } from "../actions";
import { productOptionLabel } from "../options";

export const dynamic = "force-dynamic";

type MovementFormPageProps = {
  searchParams?: Promise<{
    productId?: string;
  }>;
};

export default async function AdjustmentPage({
  searchParams
}: MovementFormPageProps) {
  await requirePagePermission("stock:write");

  const params = await searchParams;
  const selectedProductId = String(params?.productId ?? "");
  const [products, locations] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    }),
    prisma.storageLocation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" }
    })
  ]);

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Movimentacao</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Ajuste manual
        </h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <form action={registerAdjustment} className="grid gap-3 lg:grid-cols-6">
          <input
            type="hidden"
            name="idempotencyKey"
            value={`adjustment:${randomUUID()}`}
          />
          <label className="lg:col-span-3">
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
              Local afetado
            </span>
            <select
              name="affectedLocationId"
              required
              defaultValue=""
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
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Saldo final
            </span>
            <input
              name="newQuantity"
              type="number"
              min={0}
              step={1}
              required
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-3">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Justificativa
            </span>
            <input
              name="reason"
              required
              placeholder="correcao operacional, inventario, outro"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observacoes
            </span>
            <input
              name="notes"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
              <SlidersHorizontal aria-hidden className="h-4 w-4" />
              Registrar
            </button>
            <Link
              href="/movimentacoes"
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Voltar
            </Link>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
