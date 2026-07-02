import { randomUUID } from "crypto";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { StorageLocationPicker } from "@/components/location/storage-location-picker";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { registerTransfer } from "../actions";
import { productOptionLabel } from "../options";

export const dynamic = "force-dynamic";

type MovementFormPageProps = {
  searchParams?: Promise<{
    productId?: string;
  }>;
};

export default async function TransferPage({
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
          Transferencia entre locais
        </h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <form
          action={registerTransfer}
          className="grid gap-3 lg:grid-cols-8"
        >
          <input
            type="hidden"
            name="idempotencyKey"
            value={`transfer:${randomUUID()}`}
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
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Quantidade
            </span>
            <input
              name="quantity"
              type="number"
              min={1}
              step={1}
              required
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <StorageLocationPicker
            name="sourceLocationId"
            label="Origem"
            locations={locations}
            className="lg:col-span-3"
          />
          <StorageLocationPicker
            name="destinationLocationId"
            label="Destino"
            locations={locations}
            className="lg:col-span-3"
          />
          <label className="lg:col-span-7">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observacoes
            </span>
            <input
              name="notes"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark">
              <ArrowRightLeft aria-hidden className="h-4 w-4" />
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
