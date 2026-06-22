"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginAction } from "./actions";
import type { LoginState } from "./types";

const initialState: LoginState = {
  message: ""
};

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="grid gap-3">
      <label>
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Senha
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
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
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn aria-hidden className="h-4 w-4" />
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
