import {
  AlertTriangle,
  ArrowRightLeft,
  Barcode,
  Boxes,
  ClipboardCheck,
  Search,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { AuditStatus, MovementType } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

import { movementTypeLabels } from "./movimentacoes/options";

const quickActions: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}> = [
  { label: "Busca rapida", href: "/busca", icon: Search },
  {
    label: "Entrada",
    href: "/movimentacoes/entrada",
    icon: Barcode,
    permission: "stock:write"
  },
  {
    label: "Transferencia",
    href: "/movimentacoes/transferencia",
    icon: ArrowRightLeft,
    permission: "stock:write"
  },
  {
    label: "Inventario",
    href: "/inventario/novo",
    icon: ClipboardCheck,
    permission: "inventory:audit"
  }
];

export const dynamic = "force-dynamic";

function formatImpact(
  movementType: MovementType,
  quantity: number,
  delta: number | undefined
): string {
  if (movementType === MovementType.TRANSFER || delta === undefined) {
    return String(quantity);
  }

  return `${delta > 0 ? "+" : ""}${delta}`;
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const allowedQuickActions = quickActions.filter(
    (item) => !item.permission || hasPermission(user.role, item.permission)
  );

  const [
    activeProducts,
    stockSum,
    pendingDivergences,
    staleProducts,
    recentMovements
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.inventoryBalance.aggregate({ _sum: { quantity: true } }),
    prisma.inventoryAudit.count({ where: { status: AuditStatus.PENDING } }),
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
    }),
    prisma.stockMovement.findMany({
      include: {
        product: true,
        sourceLocation: true,
        destinationLocation: true,
        affectedLocation: true,
        lines: true
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const indicators = [
    {
      label: "Produtos ativos",
      value: String(activeProducts),
      detail: "Cadastro operacional"
    },
    {
      label: "Unidades em estoque",
      value: String(stockSum._sum.quantity ?? 0),
      detail: "Soma por local"
    },
    {
      label: "Divergencias pendentes",
      value: String(pendingDivergences),
      detail: "Inventario"
    },
    {
      label: "Produtos parados",
      value: String(staleProducts),
      detail: "90 dias"
    }
  ];

  const alerts = [
    pendingDivergences > 0
      ? `${pendingDivergences} divergencia(s) pendente(s) de inventario`
      : null,
    staleProducts > 0 ? `${staleProducts} produto(s) parado(s) ha 90 dias` : null
  ].filter((item): item is string => Boolean(item));

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">MVP operacional</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Dashboard de estoque
          </h2>
        </div>
        <Link
          href="/busca"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
        >
          <Search aria-hidden className="h-4 w-4" />
          Buscar vinho
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-stone-200 bg-white p-4"
          >
            <p className="text-sm text-stone-600">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
            <p className="mt-1 text-sm text-stone-500">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-stone-200 bg-white">
          <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
            <Boxes aria-hidden className="h-5 w-5 text-olive" />
            <h3 className="text-base font-semibold">Ultimas movimentacoes</h3>
          </div>
          {recentMovements.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              Nenhuma movimentacao registrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentMovements.map((movement) => {
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

                return (
                  <div
                    key={movement.id}
                    className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {movement.product.name}
                      </p>
                      <p className="text-stone-500">
                        {movementTypeLabels[movement.movementType]} - {location}
                      </p>
                    </div>
                    <p className="font-semibold text-cellar">
                      {formatImpact(
                        movement.movementType,
                        movement.quantity,
                        firstLine?.quantityDelta
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-md border border-stone-200 bg-white">
          <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
            <AlertTriangle aria-hidden className="h-5 w-5 text-brass" />
            <h3 className="text-base font-semibold">Alertas</h3>
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              Sem alertas operacionais.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {alerts.map((alert) => (
                <p key={alert} className="px-4 py-3 text-sm text-stone-700">
                  {alert}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-ink">Acoes rapidas</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {allowedQuickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-20 items-center gap-3 rounded-md border border-stone-200 bg-white px-4 text-sm font-semibold text-ink hover:border-cellar"
              >
                <Icon aria-hidden className="h-5 w-5 text-cellar" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
