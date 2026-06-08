"use server";

import { revalidatePath } from "next/cache";
import { RecordStatus, SecurityEventType, UserRole } from "@prisma/client";

import { requireActionPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/services/security-events.service";
import { createUser, resetUserPassword } from "@/services/users.service";

function requiredText(formData: FormData, field: string, label: string): string {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} e obrigatorio.`);
  }

  return value;
}

export async function createUserAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");

  const createdUser = await createUser({
    name: requiredText(formData, "name", "Nome"),
    email: requiredText(formData, "email", "Email"),
    password: requiredText(formData, "password", "Senha"),
    role: requiredText(formData, "role", "Perfil") as UserRole
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.USER_CREATED,
    actorUserId: currentUser.id,
    subjectUserId: createdUser.id,
    email: createdUser.email,
    metadata: {
      role: createdUser.role
    }
  });

  revalidatePath("/usuarios");
}

export async function inactivateUserAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");
  const id = requiredText(formData, "id", "Usuario");

  if (id === currentUser.id) {
    throw new Error("Usuario nao pode inativar a propria conta.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true, status: true }
  });

  if (!targetUser) {
    throw new Error("Usuario nao encontrado.");
  }

  if (
    targetUser.role === UserRole.ADMIN &&
    targetUser.status === RecordStatus.ACTIVE
  ) {
    const remainingActiveAdmins = await prisma.user.count({
      where: {
        id: { not: id },
        role: UserRole.ADMIN,
        status: RecordStatus.ACTIVE
      }
    });

    if (remainingActiveAdmins === 0) {
      throw new Error("Nao e permitido inativar o ultimo administrador ativo.");
    }
  }

  await prisma.user.update({
    where: { id },
    data: { status: RecordStatus.INACTIVE }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.USER_INACTIVATED,
    actorUserId: currentUser.id,
    subjectUserId: id
  });

  revalidatePath("/usuarios");
}

export async function reactivateUserAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");
  const id = requiredText(formData, "id", "Usuario");

  await prisma.user.update({
    where: { id },
    data: { status: RecordStatus.ACTIVE }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.USER_REACTIVATED,
    actorUserId: currentUser.id,
    subjectUserId: id
  });

  revalidatePath("/usuarios");
}

export async function resetUserPasswordAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");
  const id = requiredText(formData, "id", "Usuario");
  const password = requiredText(formData, "password", "Senha temporaria");

  if (id === currentUser.id) {
    throw new Error("Use Minha conta para alterar a propria senha.");
  }

  await resetUserPassword({
    targetUserId: id,
    password
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.PASSWORD_RESET,
    actorUserId: currentUser.id,
    subjectUserId: id
  });

  revalidatePath("/usuarios");
}
