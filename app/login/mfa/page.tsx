import { redirect } from "next/navigation";

import {
  authenticatedHomePath,
  getCurrentUser,
  getMfaChallenge
} from "@/lib/auth";

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
    <main className="min-h-screen bg-paper px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-md border border-stone-200 bg-white p-6">
        <p className="text-sm font-medium text-cellar">Estoque Vinhos</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
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
