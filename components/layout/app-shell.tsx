import Link from "next/link";
import {
  Archive,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Handshake,
  MapPinned,
  Search,
  Truck,
  Users
} from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/produtos", label: "Produtos", icon: Archive },
  { href: "/fornecedores", label: "Fornecedores", icon: Handshake },
  { href: "/locais", label: "Locais", icon: MapPinned },
  { href: "/movimentacoes", label: "Movimentacoes", icon: Truck },
  { href: "/inventario", label: "Inventario", icon: ClipboardCheck },
  { href: "/relatorios", label: "Relatorios", icon: Boxes },
  { href: "/usuarios", label: "Usuarios", icon: Users }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-normal text-cellar">
            Estoque Vinhos
          </p>
          <h1 className="mt-2 text-xl font-semibold text-ink">
            Controle operacional
          </h1>
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <Icon aria-hidden className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
