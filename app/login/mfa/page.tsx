import { redirect } from "next/navigation";

import {
  authenticatedHomePath,
  getCurrentUser,
  getMfaChallenge
} from "@/lib/auth";
import { BrandLogo } from "@/components/brand/brand-logo";

import { MfaChallengeForm } from "./mfa-challenge-form";

export const dynamic = "force-dynamic";

export default async function MfaChallengePage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(authenticatedHomePath(currentUser));
  }

  const challenge = await getMfaChallenge();

  if (!challenge) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center bg-paper px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-md border border-stone-200 bg-white p-6 shadow-sm">
        <div className="border-b border-stone-200 pb-5">
          <BrandLogo className="h-auto w-64 max-w-full" />
          <p className="mt-3 text-sm font-semibold text-cellarDark">
            Controle de estoque
          </p>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-ink">
          Verificacao MFA
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Informe o codigo do aplicativo autenticador para concluir o acesso de{" "}
          {challenge.email}.
        </p>

        <div className="mt-5">
          <MfaChallengeForm />
        </div>
      </section>
    </main>
  );
}
