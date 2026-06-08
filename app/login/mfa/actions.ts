"use server";

import { redirect } from "next/navigation";

import {
  clearMfaChallenge,
  createSession,
  getMfaChallenge
} from "@/lib/auth";
import { verifyMfaForLogin } from "@/services/mfa.service";

import type { MfaChallengeState } from "./types";

export async function verifyMfaAction(
  _previousState: MfaChallengeState,
  formData: FormData
): Promise<MfaChallengeState> {
  const challenge = await getMfaChallenge();

  if (!challenge) {
    return {
      message: "Desafio MFA expirado. Faca login novamente."
    };
  }

  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return {
      message: "Informe o codigo MFA."
    };
  }

  const result = await verifyMfaForLogin({
    userId: challenge.userId,
    code
  });

  if (!result.ok) {
    return {
      message: result.message
    };
  }

  await createSession(challenge.userId);
  await clearMfaChallenge();
  redirect(challenge.mustChangePassword ? "/minha-conta/senha" : "/");
}
