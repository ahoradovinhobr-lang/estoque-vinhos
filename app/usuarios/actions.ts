"use server";

import { revalidatePath } from "next/cache";
import { RecordStatus, SecurityEventType, UserRole } from "@prisma/client";

import { requireActionPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_USER_EMAIL } from "@/lib/system-user";
import { recordSecurityEvent } from "@/services/security-events.service";
import { resetUserMfa } from "@/services/mfa.service";
import { createUser, resetUserPassword } from "@/services/users.service";

function requiredText(formData: FormData, field: string, label: string): string {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} e obrigatorio.`);
  }

  return value;
}

async function getEditableUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      role: true,
      status: true
    }
  });

  if (!user) {
    throw new Error("Usuario nao encontrado.");
  }

  if (user.email === SYSTEM_USER_EMAIL) {
    throw new Error("Usuario interno do sistema nao pode ser alterado.");
  }

  return user;
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

async function assertCanRemoveActiveAdmin(targetUserId: string) {
  const remainingActiveAdmins = await prisma.user.count({
    where: {
      id: { not: targetUserId },
      email: { not: SYSTEM_USER_EMAIL },
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
    }
  });

  if (remainingActiveAdmins === 0) {
    throw new Error("Nao e permitido remover o ultimo gerente ativo.");
  }
}

export async function updateUserRoleAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");
  const id = requiredText(formData, "id", "Usuario");
  const role = requiredText(formData, "role", "Perfil") as UserRole;

  if (!Object.values(UserRole).includes(role)) {
    throw new Error("Perfil de usuario invalido.");
  }

  if (id === currentUser.id) {
    throw new Error("Usuario nao pode alterar o proprio perfil por esta tela.");
  }

  const targetUser = await getEditableUser(id);

  if (
    targetUser.role === UserRole.ADMIN &&
    targetUser.status === RecordStatus.ACTIVE &&
    role !== UserRole.ADMIN
  ) {
    await assertCanRemoveActiveAdmin(id);
  }

  await prisma.user.update({
    where: { id },
    data: {
      role,
      sessionVersion: { increment: 1 }
    }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.USER_ROLE_UPDATED,
    actorUserId: currentUser.id,
    subjectUserId: id,
    metadata: {
      previousRole: targetUser.role,
      nextRole: role
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

  const targetUser = await getEditableUser(id);

  if (
    targetUser.role === UserRole.ADMIN &&
    targetUser.status === RecordStatus.ACTIVE
  ) {
    await assertCanRemoveActiveAdmin(id);
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
  await getEditableUser(id);

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

  await getEditableUser(id);

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

export async function resetUserMfaAction(formData: FormData) {
  const currentUser = await requireActionPermission("users:write");
  const id = requiredText(formData, "id", "Usuario");

  if (id === currentUser.id) {
    throw new Error("Outro administrador precisa resetar seu MFA.");
  }

  await getEditableUser(id);

  await resetUserMfa({
    actorUserId: currentUser.id,
    targetUserId: id
  });

  revalidatePath("/usuarios");
}
