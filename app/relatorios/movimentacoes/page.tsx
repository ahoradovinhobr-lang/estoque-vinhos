import Link from "next/link";
import { MovementStatus, MovementType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ArrowRightLeft, Filter } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import {
  formatDateTime,
  movementStatusLabels,
  movementTypeLabels
} from "../report-options";

type MovementsReportPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    status?: string;
    days?: string;
  }>;
};

const periodOptions = [7, 30, 60, 90, 180];

export const dynamic = "force-dynamic";

function formatMovementLocation(
  movement: Awaited<ReturnType<typeof findMovements>>[number]
): string {
  if (movement.movementType === MovementType.TRANSFER) {
    return `${movement.sourceLocation?.code ?? "-"} -> ${
      movement.destinationLocation?.code ?? "-"
    }`;
  }

  return (
    movement.destinationLocation?.code ||
    movement.sourceLocation?.code ||
    movement.affectedLocation?.code ||
    "-"
  );
}

function formatLines(
  movement: Awaited<ReturnType<typeof findMovements>>[number]
): string {
  return movement.lines
    .slice()
    .sort((first, second) =>
      first.storageLocation.code.localeCompare(second.storageLocation.code)
    )
    .map((line) => {
      const delta = `${line.quantityDelta > 0 ? "+" : ""}${
        line.quantityDelta
      }`;

      return `${line.storageLocation.code}: ${line.quantityBefore} ${delta} = ${line.quantityAfter}`;
    })
    .join(" | ");
}

async function findMovements(where: Prisma.StockMovementWhereInput) {
  return prisma.stockMovement.findMany({
    where,
    include: {
      product: true,
      sourceLocation: true,
      destinationLocation: true,
      affectedLocation: true,
      user: true,
      lines: {
        include: {
          storageLocation: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export default async function MovementsReportPage({
  searchParams
}: MovementsReportPageProps) {
  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const selectedType = Object.values(MovementType).includes(
    String(params?.type ?? "") as MovementType
  )
    ? (String(params?.type) as MovementType)
    : "";
  const selectedStatus = Object.values(MovementStatus).includes(
    String(params?.status ?? "") as MovementStatus
  )
    ? (String(params?.status) as MovementStatus)
    : "";
  const requestedDays = Number(params?.days ?? 30);
  const days = periodOptions.includes(requestedDays) ? requestedDays : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const matchingProducts = query
    ? await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { grape: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } }
          ]
        },
        select: { id: true }
      })
    : null;

  const where: Prisma.StockMovementWhereInput = {
    createdAt: { gte: since },
    ...(selectedType ? { movementType: selectedType } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(matchingProducts
      ? { productId: { in: matchingProducts.map((product) => product.id) } }
      : {})
  };
  const movements =
    matchingProducts && matchingProducts.length === 0
      ? []
      : await findMovements(where);
  const totalQuantity = movements.reduce(
    (sum, movement) => sum + movement.quantity,
    0
  );
  const reversedCount = movements.filter(
    (movement) => movement.status === MovementStatus.REVERSED
  ).length;

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Relatorios</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Movimentacoes
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
          <p className="text-sm text-stone-600">Movimentacoes listadas</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {movements.length}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Quantidade total</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {totalQuantity}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Estornadas</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {reversedCount}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <form
          action="/relatorios/movimentacoes"
          className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <input
            name="q"
            defaultValue={query}
            placeholder="Produto, SKU, uva ou codigo de barras"
            className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          />
          <select
            name="type"
            defaultValue={selectedType}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          >
            <option value="">Todos os tipos</option>
            {Object.values(MovementType).map((type) => (
              <option key={type} value={type}>
                {movementTypeLabels[type]}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          >
            <option value="">Todos os status</option>
            {Object.values(MovementStatus).map((status) => (
              <option key={status} value={status}>
                {movementStatusLabels[status]}
              </option>
            ))}
          </select>
          <select
            name="days"
            defaultValue={String(days)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          >
            {periodOptions.map((option) => (
              <option key={option} value={option}>
                Ultimos {option} dias
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
            <Filter aria-hidden className="h-4 w-4" />
            Filtrar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <ArrowRightLeft aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Historico filtrado
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 text-right font-medium">Qtd.</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={9}
                  >
                    Nenhuma movimentacao encontrada.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      {movementTypeLabels[movement.movementType]}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {movementStatusLabels[movement.status]}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        {movement.product.name}
                      </p>
                      <p className="text-stone-500">SKU {movement.product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {movement.quantity}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatMovementLocation(movement)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatLines(movement) || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {movement.user.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {movement.reason || movement.notes || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatDateTime(movement.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
