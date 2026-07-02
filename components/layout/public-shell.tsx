"use client";

import Link from "next/link";
import { LogIn, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="min-w-0" onClick={() => setOpen(false)}>
            <BrandLogo className="h-auto w-40 max-w-full" />
            <p className="mt-1 text-xs font-semibold text-cellarDark">
              Consulta de vinhos
            </p>
          </Link>
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
          <aside className="relative flex h-dvh max-h-dvh w-[min(20rem,85vw)] flex-col overflow-hidden border-r border-stone-200 bg-white px-4 py-5 shadow-xl">
            <div className="mb-5 flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <BrandLogo className="h-auto w-44 max-w-full" />
                <h1 className="mt-3 text-lg font-semibold text-cellarDark">
                  Consulta de vinhos
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

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-blush hover:text-cellarDark"
              >
                <Search aria-hidden className="h-4 w-4 text-cellar" />
                Consulta
              </Link>
            </nav>

            <div className="mt-5 shrink-0 rounded-md border border-blush bg-stone-50 p-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <LogIn aria-hidden className="h-4 w-4" />
                Login
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 lg:flex">
        <Link
          href="/"
          className="mb-6 block shrink-0 rounded-md border border-blush bg-blush px-3 py-3"
        >
          <BrandLogo className="h-auto w-44" />
          <p className="mt-3 text-sm font-semibold text-cellarDark">
            Consulta de vinhos
          </p>
        </Link>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <Link
            href="/"
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-blush hover:text-cellarDark"
          >
            <Search aria-hidden className="h-4 w-4 text-cellar" />
            Consulta
          </Link>
        </nav>

        <div className="mt-5 shrink-0 rounded-md border border-blush bg-stone-50 p-3">
          <Link
            href="/login"
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <LogIn aria-hidden className="h-4 w-4" />
            Login
          </Link>
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
