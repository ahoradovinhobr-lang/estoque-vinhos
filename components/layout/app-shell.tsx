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
  ShoppingCart,
  Truck,
  Upload,
  Users,
  type LucideIcon
} from "lucide-react";

import { requirePageUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { hasPermission, type Permission } from "@/lib/permissions";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

type NavigationItem = {
  href: string;
  label: string;
  iconKey: IconKey;
  icon: LucideIcon;
  permission?: Permission;
};

export type IconKey =
  | "archive"
  | "barChart"
  | "barcode"
  | "boxes"
  | "clipboardCheck"
  | "handshake"
  | "mapPinned"
  | "search"
  | "shieldCheck"
  | "truck"
  | "upload"
  | "users";

export type MobileNavigationItem = {
  href: string;
  label: string;
  iconKey: IconKey;
};

const navigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    iconKey: "barChart",
    icon: BarChart3,
    permission: "reports:read"
  },
  {
    href: "/leitura",
    label: "Busca e leitura",
    iconKey: "search",
    icon: Search,
    permission: "stock:read"
  },
  {
    href: "/produtos",
    label: "Produtos",
    iconKey: "archive",
    icon: Archive,
    permission: "products:write"
  },
  {
    href: "/fornecedores",
    label: "Fornecedores",
    iconKey: "handshake",
    icon: Handshake,
    permission: "suppliers:write"
  },
  {
    href: "/locais",
    label: "Locais",
    iconKey: "mapPinned",
    icon: MapPinned,
    permission: "locations:write"
  },
  {
    href: "/movimentacoes",
    label: "Movimentacoes",
    iconKey: "truck",
    icon: Truck,
    permission: "stock:read"
  },
  {
    href: "/inventario",
    label: "Inventario",
    iconKey: "clipboardCheck",
    icon: ClipboardCheck,
    permission: "inventory:audit"
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    iconKey: "boxes",
    icon: Boxes,
    permission: "reports:read"
  },
  {
    href: "/importacao",
    label: "Importacao",
    iconKey: "upload",
    icon: Upload,
    permission: "imports:write"
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    iconKey: "users",
    icon: Users,
    permission: "users:write"
  },
  {
    href: "/seguranca",
    label: "Seguranca",
    iconKey: "shieldCheck",
    icon: ShieldCheck,
    permission: "security:read"
  }
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Gerente",
  ESTOQUE: "Estoquista",
  CONSULTA: "Consulta"
};

export async function AppShell({
  allowPasswordChangeRequired = false,
  allowMfaSetupRequired = false,
  children
}: {
  allowPasswordChangeRequired?: boolean;
  allowMfaSetupRequired?: boolean;
  children: React.ReactNode;
}) {
  const user = await requirePageUser({
    allowPasswordChangeRequired,
    allowMfaSetupRequired
  });
  const allowedNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(user.role, item.permission)
  );
  const mobileNavigation = allowedNavigation.map(
    ({ href, label, iconKey }) => ({
      href,
      label,
      iconKey
    })
  );

  return (
    <div className="min-h-screen bg-paper">
      <MobileNavigation
        navigation={mobileNavigation}
        userName={user.name}
        userRoleLabel={roleLabels[user.role]}
        showMfaLink={user.role === "ADMIN"}
        showSaleLink={hasPermission(user.role, "stock:sale")}
      />

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 lg:flex">
        <Link
          href="/"
          className="mb-6 block shrink-0 rounded-md border border-blush bg-blush px-3 py-3"
        >
          <BrandLogo className="h-auto w-44" />
          <p className="mt-3 text-sm font-semibold text-cellarDark">
            Estoque operacional
          </p>
        </Link>

        {hasPermission(user.role, "stock:sale") ? (
          <Link
            href="/movimentacoes/venda"
            className="mb-4 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark"
          >
            <ShoppingCart aria-hidden className="h-4 w-4" />
            Registrar venda
          </Link>
        ) : null}

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {allowedNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-blush hover:text-cellarDark"
              >
                <Icon aria-hidden className="h-4 w-4 text-cellar" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 shrink-0 rounded-md border border-blush bg-stone-50 p-3">
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="mt-1 text-xs text-stone-500">
            {roleLabels[user.role]}
          </p>
          <Link
            href="/minha-conta/senha"
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <KeyRound aria-hidden className="h-4 w-4" />
            Senha
          </Link>
          {user.role === "ADMIN" ? (
            <Link
              href="/minha-conta/mfa"
              className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              <ShieldCheck aria-hidden className="h-4 w-4" />
              MFA
            </Link>
          ) : null}
          <form action={logoutAction} className="mt-3">
            <button className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto min-h-screen min-w-0 max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
