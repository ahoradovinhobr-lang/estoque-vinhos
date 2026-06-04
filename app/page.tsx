import {
  AlertTriangle,
  ArrowRightLeft,
  Barcode,
  Boxes,
  ClipboardCheck,
  Search
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

const indicators = [
  { label: "Produtos ativos", value: "0", detail: "Aguardando cadastro" },
  { label: "Unidades em estoque", value: "0", detail: "Soma por local" },
  { label: "Divergencias pendentes", value: "0", detail: "Inventario" },
  { label: "Produtos parados", value: "0", detail: "90 dias" }
];

const quickActions = [
  { label: "Busca rapida", href: "/busca", icon: Search },
  { label: "Entrada", href: "/movimentacoes/entrada", icon: Barcode },
  { label: "Transferencia", href: "/movimentacoes/transferencia", icon: ArrowRightLeft },
  { label: "Inventario", href: "/inventario/novo", icon: ClipboardCheck }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">MVP operacional</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Dashboard de estoque
          </h2>
        </div>
        <a
          href="/busca"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
        >
          <Search aria-hidden className="h-4 w-4" />
          Buscar vinho
        </a>
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
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            Nenhuma movimentacao registrada ainda.
          </div>
        </div>

        <div className="rounded-md border border-stone-200 bg-white">
          <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
            <AlertTriangle aria-hidden className="h-5 w-5 text-brass" />
            <h3 className="text-base font-semibold">Alertas</h3>
          </div>
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            Sem alertas enquanto o estoque inicial nao for importado.
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-ink">Acoes rapidas</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex h-20 items-center gap-3 rounded-md border border-stone-200 bg-white px-4 text-sm font-semibold text-ink hover:border-cellar"
              >
                <Icon aria-hidden className="h-5 w-5 text-cellar" />
                {item.label}
              </a>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
