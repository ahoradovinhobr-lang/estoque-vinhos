"use client";

import Link from "next/link";
import {
  Archive,
  BarChart3,
  Barcode,
  Boxes,
  ClipboardCheck,
  Handshake,
  KeyRound,
  MapPinned,
  Menu,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/login/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import type {
  IconKey,
  MobileNavigationItem
} from "@/components/layout/app-shell";

const iconMap: Record<IconKey, LucideIcon> = {
  archive: Archive,
  barChart: BarChart3,
  barcode: Barcode,
  boxes: Boxes,
  clipboardCheck: ClipboardCheck,
  handshake: Handshake,
  mapPinned: MapPinned,
  search: Search,
  shieldCheck: ShieldCheck,
  truck: Truck,
  upload: Upload,
  users: Users
};

export function MobileNavigation({
  navigation,
  userName,
  userRoleLabel,
  showMfaLink
}: {
  navigation: MobileNavigationItem[];
  userName: string;
  userRoleLabel: string;
  showMfaLink: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <BrandLogo className="h-auto w-40 max-w-full" />
            <p className="mt-1 text-xs font-semibold text-cellarDark">
              Estoque operacional
            </p>
          </div>
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,85vw)] flex-col border-r border-stone-200 bg-white px-4 py-5 shadow-xl">
            <div className="mb-5 flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <BrandLogo className="h-auto w-44 max-w-full" />
                <h1 className="mt-3 text-lg font-semibold text-cellarDark">
                  Estoque operacional
                </h1>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {navigation.map((item) => {
                const Icon = iconMap[item.iconKey];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-blush hover:text-cellarDark"
                  >
                    <Icon aria-hidden className="h-4 w-4 text-cellar" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 shrink-0 rounded-md border border-blush bg-stone-50 p-3">
              <p className="text-sm font-semibold text-ink">{userName}</p>
              <p className="mt-1 text-xs text-stone-500">
                {userRoleLabel}
              </p>
              <Link
                href="/minha-conta/senha"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <KeyRound aria-hidden className="h-4 w-4" />
                Senha
              </Link>
              {showMfaLink ? (
                <Link
                  href="/minha-conta/mfa"
                  onClick={() => setOpen(false)}
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
        </div>
      ) : null}
    </>
  );
}
