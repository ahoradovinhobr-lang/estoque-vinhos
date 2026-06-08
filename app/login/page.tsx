import { redirect } from "next/navigation";

import { getCurrentUser, isAuthConfigured } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { ensureBootstrapAdmin } from "@/services/users.service";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  const bootstrap = await ensureBootstrapAdmin();

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-md border border-stone-200 bg-white p-6">
        <p className="text-sm font-medium text-cellar">Estoque Vinhos</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Acesso operacional
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Entre com um usuario ativo para acessar estoque, inventario,
          importacao e relatorios.
        </p>

        {!isAuthConfigured() ? (
          <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
            Configure `AUTH_SECRET` com pelo menos 32 caracteres no Railway.
          </div>
        ) : !bootstrap.configured ? (
          <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
            Configure `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` para
            criar o primeiro administrador. A senha deve ter pelo menos{" "}
            {PASSWORD_MIN_LENGTH} caracteres.
          </div>
        ) : (
          <div className="mt-5">
            {bootstrap.created ? (
              <p className="mb-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                Administrador inicial criado. Use as credenciais configuradas.
              </p>
            ) : null}
            <LoginForm />
          </div>
        )}
      </section>
    </main>
  );
}
