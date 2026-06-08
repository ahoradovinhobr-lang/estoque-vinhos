"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

import { changePasswordAction } from "./actions";
import type { ChangePasswordState } from "./types";

const initialState: ChangePasswordState = {
  message: ""
};

export function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={action} className="grid gap-3">
      <label>
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Senha atual
        </span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Nova senha
        </span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Confirmar nova senha
        </span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
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
        <KeyRound aria-hidden className="h-4 w-4" />
        {isPending ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
