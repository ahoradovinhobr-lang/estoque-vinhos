import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  return (
    <AppShell>
      <section className="mx-auto mt-16 max-w-xl rounded-md border border-stone-200 bg-white p-6 text-center">
        <ShieldAlert
          aria-hidden
          className="mx-auto h-10 w-10 text-cellar"
        />
        <h2 className="mt-4 text-2xl font-semibold text-ink">
          Acesso negado
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Seu perfil nao tem permissao para acessar esta area.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
        >
          Voltar ao dashboard
        </Link>
      </section>
    </AppShell>
  );
}
