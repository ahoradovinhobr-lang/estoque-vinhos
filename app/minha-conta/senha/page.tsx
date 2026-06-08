import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requirePageUser({ allowPasswordChangeRequired: true });

  return (
    <AppShell allowPasswordChangeRequired>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Minha conta</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Alterar senha
        </h2>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1fr]">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h3 className="text-base font-semibold text-ink">{user.name}</h3>
          <p className="mt-1 text-sm text-stone-600">{user.email}</p>
          <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            A nova senha precisa ter pelo menos {PASSWORD_MIN_LENGTH} caracteres
            e nao pode ser uma senha comum.
          </p>
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-4">
          <ChangePasswordForm />
        </div>
      </section>
    </AppShell>
  );
}
