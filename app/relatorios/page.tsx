import Link from "next/link";
import { AuditStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  FileSearch,
  PackageSearch,
  Upload
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

const reportLinks = [
  {
    href: "/relatorios/estoque-atual",
    label: "Estoque atual",
    detail: "Saldo total e por local",
    icon: BarChart3
  },
  {
    href: "/relatorios/divergencias",
    label: "Divergencias",
    detail: "Conferencias pendentes e ajustadas",
    icon: AlertTriangle
  },
  {
    href: "/relatorios/produtos-parados",
    label: "Produtos parados",
    detail: "Sem movimentacao por periodo",
    icon: PackageSearch
  },
  {
    href: "/relatorios/movimentacoes",
    label: "Movimentacoes",
    detail: "Historico filtravel",
    icon: ArrowRightLeft
  },
  {
    href: "/importacao",
    label: "Importacao inicial",
    detail: "Simular e aplicar planilha",
    icon: Upload
  }
];

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    activeProducts,
    stockSum,
    locationsWithStock,
    pendingDivergences,
    recentMovements,
    staleProducts
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.inventoryBalance.aggregate({ _sum: { quantity: true } }),
    prisma.inventoryBalance.findMany({
      where: { quantity: { gt: 0 } },
      select: { storageLocationId: true }
    }),
    prisma.inventoryAudit.count({ where: { status: AuditStatus.PENDING } }),
    prisma.stockMovement.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    }),
    prisma.product.count({
      where: {
        status: "ACTIVE",
        createdAt: { lt: ninetyDaysAgo },
        movements: {
          none: {
            createdAt: { gte: ninetyDaysAgo }
          }
        }
      }
    })
  ]);

  const indicators = [
    {
      label: "Produtos ativos",
      value: String(activeProducts),
      detail: "Base cadastrada"
    },
    {
      label: "Unidades em estoque",
      value: String(stockSum._sum.quantity ?? 0),
      detail: "Saldo consolidado"
    },
    {
      label: "Locais com saldo",
      value: String(
        new Set(locationsWithStock.map((balance) => balance.storageLocationId))
          .size
      ),
      detail: "Armazenamento usado"
    },
    {
      label: "Movimentacoes 30 dias",
      value: String(recentMovements),
      detail: "Atividade recente"
    }
  ];

  const readinessItems = [
    {
      label: "Relatorios principais",
      status: "Disponivel",
      detail: "Estoque, divergencias, produtos parados e historico."
    },
    {
      label: "Divergencias pendentes",
      status: pendingDivergences === 0 ? "OK" : "Revisar",
      detail: `${pendingDivergences} conferencia(s) pendente(s).`
    },
    {
      label: "Produtos parados",
      status: staleProducts === 0 ? "OK" : "Revisar",
      detail: `${staleProducts} produto(s) sem movimentacao ha 90 dias.`
    },
    {
      label: "Importacao inicial",
      status: "Disponivel",
      detail: "Simulacao e aplicacao definitiva por CSV/TSV."
    },
    {
      label: "Backup e restauracao",
      status: "Operacional externo",
      detail: "Definir retencao no Railway/Postgres antes do uso real."
    }
  ];

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Analise</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Relatorios</h2>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-stone-200 bg-white p-4"
          >
            <p className="text-sm text-stone-600">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">
              {item.value}
            </p>
            <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {reportLinks.map((item) => {
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
          <ClipboardList aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Preparacao para uso
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {readinessItems.map((item) => (
                <tr key={item.label} className="border-b border-stone-100">
                  <td className="px-4 py-3 font-medium text-ink">
                    {item.label}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{item.status}</td>
                  <td className="px-4 py-3 text-stone-600">{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <FileSearch aria-hidden className="mt-0.5 h-5 w-5 text-cellar" />
          <div>
            <h3 className="text-base font-semibold text-ink">
              Criterio operacional
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Use estes relatorios para conferir o estoque real antes de
              cadastrar a carga inicial definitiva e antes de liberar usuarios
              de consulta.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
