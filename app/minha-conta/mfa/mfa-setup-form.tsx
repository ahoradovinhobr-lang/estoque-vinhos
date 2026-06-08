"use client";

import { useActionState } from "react";
import { KeyRound, RotateCcw, ShieldCheck } from "lucide-react";

import {
  enableMfaAction,
  regenerateRecoveryCodesAction
} from "./actions";
import type { MfaSetupState } from "./types";

const initialState: MfaSetupState = {
  message: ""
};

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-sm font-semibold text-ink">Codigos de recuperacao</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {codes.map((code) => (
          <code
            key={code}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink"
          >
            {code}
          </code>
        ))}
      </div>
    </div>
  );
}

export function MfaSetupPanel({
  secret,
  qrCodeDataUrl
}: {
  secret: string;
  qrCodeDataUrl: string | null;
}) {
  const [state, action, isPending] = useActionState(
    enableMfaAction,
    initialState
  );

  if (state.recoveryCodes) {
    return (
      <div className="grid gap-3">
        {state.message ? (
          <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {state.message}
          </p>
        ) : null}
        <RecoveryCodes codes={state.recoveryCodes} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {qrCodeDataUrl ? (
        <img
          src={qrCodeDataUrl}
          alt="QR code MFA"
          width={220}
          height={220}
          className="rounded-md border border-stone-200"
        />
      ) : null}
      <div>
        <p className="text-sm font-medium text-stone-700">Chave manual</p>
        <code className="mt-1 block break-all rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-ink">
          {secret}
        </code>
      </div>
      <form action={action} className="grid gap-3">
        <label>
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Codigo do autenticador
          </span>
          <input
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            required
            className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          />
        </label>
        {state.message ? (
          <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {state.message}
          </p>
        ) : null}
        <button
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          {isPending ? "Ativando..." : "Ativar MFA"}
        </button>
      </form>
    </div>
  );
}

export function RegenerateRecoveryCodesForm() {
  const [state, action, isPending] = useActionState(
    regenerateRecoveryCodesAction,
    initialState
  );

  return (
    <form action={action} className="grid gap-3">
      {state.message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {state.message}
        </p>
      ) : null}
      {state.recoveryCodes ? (
        <RecoveryCodes codes={state.recoveryCodes} />
      ) : null}
      <button
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCcw aria-hidden className="h-4 w-4" />
        {isPending ? "Gerando..." : "Gerar novos codigos"}
      </button>
    </form>
  );
}

export function MfaStatusIcon() {
  return <KeyRound aria-hidden className="h-4 w-4 text-cellar" />;
}
