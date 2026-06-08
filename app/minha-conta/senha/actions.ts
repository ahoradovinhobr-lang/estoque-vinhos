"use server";

import { redirect } from "next/navigation";

import { createSession, requireActionUser } from "@/lib/auth";
import { changeOwnPassword } from "@/services/users.service";

import type { ChangePasswordState } from "./types";

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireActionUser({ allowPasswordChangeRequired: true });

  try {
    await changeOwnPassword({
      userId: user.id,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    });

    await createSession(user.id);
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Falha ao alterar senha."
    };
  }

  redirect("/");
}
