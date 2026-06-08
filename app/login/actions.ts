"use server";

import { redirect } from "next/navigation";

import { clearSession, createSession, isAuthConfigured } from "@/lib/auth";
import { authenticateUser } from "@/services/users.service";

import type { LoginState } from "./types";

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      message: "AUTH_SECRET precisa ser configurado antes do login."
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Informe email e senha." };
  }

  const user = await authenticateUser({ email, password });

  if (!user) {
    return {
      message: "Email/senha invalidos ou acesso temporariamente bloqueado."
    };
  }

  await createSession(user.id);
  redirect(user.mustChangePassword ? "/minha-conta/senha" : "/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
