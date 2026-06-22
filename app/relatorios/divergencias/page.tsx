import Link from "next/link";
import { AuditStatus } from "@prisma/client";
import { AlertTriangle, Filter } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  auditStatusLabels,
  formatDateTime,
  formatDelta
} from "../report-options";

type DivergencesReportPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function DivergencesReportPage({
  searchParams
}: DivergencesReportPageProps) {
  await requirePagePermission("reports:read");

  const params = await searchParams;
  const selectedStatus = Object.values(AuditStatus).includes(
    String(params?.status ?? "") as AuditStatus
  )
    ? (String(params?.status) as AuditStatus)
    : "";
  const audits = await prisma.inventoryAudit.findMany({
    where: selectedStatus
      ? {
          status: selectedStatus
        }
      : undefined,
    include: {
      product: true,
      storageLocation: true,
      user: true,
      adjustmentMovement: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const pendingCount = audits.filter(
    (audit) => audit.status === AuditStatus.PENDING
  ).length;
  const absoluteDifference = audits.reduce(
    (sum, audit) => sum + Math.abs(audit.difference),
    0
  );

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Relatorios</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Divergencias
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
          <p className="text-sm text-stone-600">Divergencias listadas</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {audits.length}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Pendentes</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">Diferenca absoluta</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {absoluteDifference}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <form action="/relatorios/divergencias" className="flex flex-col gap-3 sm:flex-row">
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          >
            <option value="">Todos os status</option>
            {Object.values(AuditStatus).map((status) => (
              <option key={status} value={status}>
                {auditStatusLabels[status]}
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
          <AlertTriangle aria-hidden className="h-4 w-4 text-brass" />
          <h3 className="text-base font-semibold text-ink">
            Conferencias e divergencias
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
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
                <th className="px-4 py-3 font-medium">Movimento</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={9}
                  >
                    Nenhuma conferencia encontrada.
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
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
                      {formatDateTime(audit.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {audit.adjustmentMovement
                        ? audit.adjustmentMovement.id.slice(0, 8)
                        : "-"}
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
