import { UserRole } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/auth";
import {
  ensureMfaSetup,
  getMfaAccountStatus
} from "@/services/mfa.service";

import {
  MfaSetupPanel,
  MfaStatusIcon,
  RegenerateRecoveryCodesForm
} from "./mfa-setup-form";

export const dynamic = "force-dynamic";

export default async function MfaSetupPage() {
  const user = await requirePageUser({
    allowMfaSetupRequired: true
  });
  const status = await getMfaAccountStatus(user.id);
  const setup =
    status.enabled || status.role !== UserRole.ADMIN
      ? null
      : await ensureMfaSetup(user.id);

  return (
    <AppShell allowMfaSetupRequired>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Minha conta</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Autenticacao MFA
        </h2>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <MfaStatusIcon />
            <h3 className="text-base font-semibold text-ink">{user.name}</h3>
          </div>
          <p className="mt-1 text-sm text-stone-600">{user.email}</p>
          <div className="mt-4 grid gap-2 text-sm text-stone-700">
            <p>
              Status:{" "}
              <span className="font-semibold text-ink">
                {status.enabled ? "Ativo" : "Configuracao obrigatoria"}
              </span>
            </p>
            {status.confirmedAt ? (
              <p>
                Confirmado em{" "}
                {status.confirmedAt.toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo"
                })}
              </p>
            ) : null}
            {status.enabled ? (
              <p>
                Codigos de recuperacao disponiveis:{" "}
                {status.recoveryCodesRemaining}
              </p>
            ) : null}
          </div>
          {status.role === UserRole.ADMIN ? (
            <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              Administradores precisam usar MFA para acessar o sistema.
            </p>
          ) : (
            <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              MFA ainda nao e obrigatorio para este perfil.
            </p>
          )}
        </div>

        {status.enabled ? (
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h3 className="mb-4 text-base font-semibold text-ink">
              Recuperacao de acesso
            </h3>
            <RegenerateRecoveryCodesForm />
          </div>
        ) : setup ? (
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h3 className="text-base font-semibold text-ink">Configurar MFA</h3>
            <div className="mt-4">
              <MfaSetupPanel
                secret={setup.secret}
                qrCodeDataUrl={setup.qrCodeDataUrl}
              />
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
