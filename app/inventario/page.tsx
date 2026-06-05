import { randomUUID } from "crypto";
import Link from "next/link";
import { AuditStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  XCircle
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  approveInventoryAudit,
  ignorePendingInventoryAudit
} from "./actions";

const auditStatusLabels: Record<AuditStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  ADJUSTED: "Ajustado",
  IGNORED: "Ignorado"
};

function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requirePagePermission("inventory:audit");

  const [pendingAudits, recentAudits, pendingCount, adjustedCount] =
    await Promise.all([
      prisma.inventoryAudit.findMany({
        where: { status: AuditStatus.PENDING },
        include: {
          product: true,
          storageLocation: true,
          user: true
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.inventoryAudit.findMany({
        include: {
          product: true,
          storageLocation: true,
          user: true,
          adjustmentMovement: true
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      prisma.inventoryAudit.count({
        where: { status: AuditStatus.PENDING }
      }),
      prisma.inventoryAudit.count({
        where: { status: AuditStatus.ADJUSTED }
      })
    ]);

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Conferencia</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Inventario</h2>
        </div>
        <Link
          href="/inventario/novo"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
        >
          <ClipboardCheck aria-hidden className="h-4 w-4" />
          Nova conferencia
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Divergencias pendentes</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Ajustes por inventario</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {adjustedCount}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Ultimas conferencias</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {recentAudits.length}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Status operacional</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {pendingCount === 0 ? "OK" : "Revisar"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <AlertTriangle aria-hidden className="h-4 w-4 text-brass" />
          <h3 className="text-base font-semibold text-ink">
            Divergencias pendentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 text-right font-medium">Sistema</th>
                <th className="px-4 py-3 text-right font-medium">Contado</th>
                <th className="px-4 py-3 text-right font-medium">Diferenca</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pendingAudits.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={6}
                  >
                    Nenhuma divergencia pendente.
                  </td>
                </tr>
              ) : (
                pendingAudits.map((audit) => (
                  <tr key={audit.id} className="border-b border-stone-100">
                    <td className="px-4 py-3 font-medium text-ink">
                      {audit.product.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {audit.storageLocation.code}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.expectedQuantity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.countedQuantity}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {formatDelta(audit.difference)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-2 xl:grid-cols-2">
                        <form
                          action={approveInventoryAudit}
                          className="flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="inventoryAuditId"
                            value={audit.id}
                          />
                          <input
                            type="hidden"
                            name="idempotencyKey"
                            value={`inventory-approve:${audit.id}:${randomUUID()}`}
                          />
                          <input
                            name="reason"
                            required
                            placeholder="justificativa"
                            className="h-9 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
                          />
                          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cellar px-3 text-sm font-semibold text-white hover:bg-[#4f2733]">
                            <CheckCircle2 aria-hidden className="h-4 w-4" />
                            Ajustar
                          </button>
                        </form>
                        <form
                          action={ignorePendingInventoryAudit}
                          className="flex gap-2"
                        >
                          <input
                            type="hidden"
                            name="inventoryAuditId"
                            value={audit.id}
                          />
                          <input
                            name="reason"
                            required
                            placeholder="justificativa"
                            className="h-9 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
                          />
                          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                            <XCircle aria-hidden className="h-4 w-4" />
                            Ignorar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <ListChecks aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Historico de conferencias
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 text-right font-medium">Sistema</th>
                <th className="px-4 py-3 text-right font-medium">Contado</th>
                <th className="px-4 py-3 text-right font-medium">Diferenca</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={8}
                  >
                    Nenhuma conferencia registrada.
                  </td>
                </tr>
              ) : (
                recentAudits.map((audit) => (
                  <tr key={audit.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      {auditStatusLabels[audit.status]}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {audit.product.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {audit.storageLocation.code}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.expectedQuantity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.countedQuantity}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {formatDelta(audit.difference)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {audit.user.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {audit.createdAt.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo"
                      })}
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
