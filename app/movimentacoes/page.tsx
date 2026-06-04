import Link from "next/link";
import { MovementType } from "@prisma/client";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  History,
  SlidersHorizontal,
  TriangleAlert
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import { movementTypeLabels } from "./options";

const movementActions = [
  {
    href: "/movimentacoes/entrada",
    label: "Entrada",
    detail: "Adicionar saldo em um local",
    icon: ArrowDownToLine
  },
  {
    href: "/movimentacoes/saida",
    label: "Saida",
    detail: "Retirar saldo de um local",
    icon: ArrowUpFromLine
  },
  {
    href: "/movimentacoes/transferencia",
    label: "Transferencia",
    detail: "Mover entre locais",
    icon: ArrowRightLeft
  },
  {
    href: "/movimentacoes/ajuste",
    label: "Ajuste",
    detail: "Definir saldo final com justificativa",
    icon: SlidersHorizontal
  },
  {
    href: "/movimentacoes/perda",
    label: "Perda/Avaria",
    detail: "Baixar saldo com motivo",
    icon: TriangleAlert
  }
];

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    include: {
      product: true,
      sourceLocation: true,
      destinationLocation: true,
      affectedLocation: true,
      lines: true,
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Estoque</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Movimentacoes
        </h2>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {movementActions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-stone-200 bg-white p-4 hover:border-cellar/40"
            >
              <Icon aria-hidden className="mb-3 h-5 w-5 text-cellar" />
              <p className="font-semibold text-ink">{item.label}</p>
              <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <History aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Historico recente
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 text-right font-medium">Impacto</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={6}
                  >
                    Nenhuma movimentacao registrada.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const location =
                    movement.movementType === MovementType.TRANSFER
                      ? `${movement.sourceLocation?.code ?? "-"} -> ${
                          movement.destinationLocation?.code ?? "-"
                        }`
                      : movement.destinationLocation?.code ||
                        movement.sourceLocation?.code ||
                        movement.affectedLocation?.code ||
                        "-";
                  const firstLine = movement.lines[0];
                  const delta = firstLine?.quantityDelta;
                  const impact =
                    movement.movementType === MovementType.TRANSFER ||
                    delta === undefined
                      ? String(movement.quantity)
                      : `${delta > 0 ? "+" : ""}${delta}`;

                  return (
                    <tr key={movement.id} className="border-b border-stone-100">
                      <td className="px-4 py-3">
                        {movementTypeLabels[movement.movementType]}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {movement.product.name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {impact}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{location}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {movement.user.name}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {movement.createdAt.toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo"
                        })}
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
