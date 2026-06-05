"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { RecordStatus } from "@prisma/client";

import { clearSession, createSession, isAuthConfigured } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const user = await prisma.user.findUnique({
    where: { email }
  });

  const passwordMatches =
    user?.passwordHash.startsWith("$2") &&
    (await bcrypt.compare(password, user.passwordHash));

  if (!user || user.status !== RecordStatus.ACTIVE || !passwordMatches) {
    return { message: "Email ou senha invalidos." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
