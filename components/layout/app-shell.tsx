import Link from "next/link";
import type { UserRole } from "@prisma/client";
import {
  Archive,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Handshake,
  KeyRound,
  MapPinned,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  Users,
  type LucideIcon
} from "lucide-react";

import { requirePageUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { hasPermission, type Permission } from "@/lib/permissions";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

const navigation: NavigationItem[] = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/busca", label: "Busca", icon: Search },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Archive,
    permission: "products:write"
  },
  {
    href: "/fornecedores",
    label: "Fornecedores",
    icon: Handshake,
    permission: "suppliers:write"
  },
  {
    href: "/locais",
    label: "Locais",
    icon: MapPinned,
    permission: "locations:write"
  },
  {
    href: "/movimentacoes",
    label: "Movimentacoes",
    icon: Truck,
    permission: "stock:read"
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: ClipboardCheck,
    permission: "inventory:audit"
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    icon: Boxes,
    permission: "reports:read"
  },
  {
    href: "/importacao",
    label: "Importacao",
    icon: Upload,
    permission: "imports:write"
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    permission: "users:write"
  },
  {
    href: "/seguranca",
    label: "Seguranca",
    icon: ShieldCheck,
    permission: "security:read"
  }
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  ESTOQUE: "Estoque",
  CONSULTA: "Consulta"
};

export async function AppShell({
  allowPasswordChangeRequired = false,
  children
}: {
  allowPasswordChangeRequired?: boolean;
  children: React.ReactNode;
}) {
  const user = await requirePageUser({ allowPasswordChangeRequired });
  const allowedNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(user.role, item.permission)
  );

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
          {allowedNavigation.map((item) => {
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

        <div className="absolute inset-x-4 bottom-5 rounded-md border border-stone-200 bg-stone-50 p-3">
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="mt-1 text-xs text-stone-500">
            {roleLabels[user.role]}
          </p>
          <Link
            href="/minha-conta/senha"
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <KeyRound aria-hidden className="h-4 w-4" />
            Minha conta
          </Link>
          <form action={logoutAction} className="mt-3">
            <button className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
