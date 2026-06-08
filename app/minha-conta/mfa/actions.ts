"use server";

import { revalidatePath } from "next/cache";

import { createSession, requireActionUser } from "@/lib/auth";
import {
  enableMfaForCurrentUser,
  regenerateOwnRecoveryCodes
} from "@/services/mfa.service";

import type { MfaSetupState } from "./types";

export async function enableMfaAction(
  _previousState: MfaSetupState,
  formData: FormData
): Promise<MfaSetupState> {
  const user = await requireActionUser({
    allowMfaSetupRequired: true
  });
  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return {
      message: "Informe o codigo MFA."
    };
  }

  try {
    const recoveryCodes = await enableMfaForCurrentUser({
      userId: user.id,
      code
    });

    await createSession(user.id);

    return {
      message: "MFA ativado. Guarde estes codigos de recuperacao agora.",
      recoveryCodes
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Falha ao ativar MFA."
    };
  }
}

export async function regenerateRecoveryCodesAction(
  _previousState: MfaSetupState,
  _formData: FormData
): Promise<MfaSetupState> {
  const user = await requireActionUser();

  try {
    const recoveryCodes = await regenerateOwnRecoveryCodes(user.id);
    revalidatePath("/minha-conta/mfa");

    return {
      message: "Novos codigos gerados. Os anteriores foram invalidados.",
      recoveryCodes
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Falha ao gerar novos codigos."
    };
  }
}
