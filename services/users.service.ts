import bcrypt from "bcryptjs";
import { RecordStatus, SecurityEventType, UserRole } from "@prisma/client";

import { validatePasswordPolicy } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/services/security-events.service";

const SYSTEM_USER_EMAIL = "operador@estoque.local";
export const LOGIN_LOCK_THRESHOLD = 5;
export const LOGIN_LOCK_MINUTES = 15;

const DUMMY_PASSWORD_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEeO3Z1iiZaY5E1Qj/Mv0Wg5jAbIYr4C0Y2";

async function hashPassword(password: string): Promise<string> {
  const policyError = validatePasswordPolicy(password);

  if (policyError) {
    throw new Error(policyError);
  }

  return bcrypt.hash(password, 12);
}

export async function ensureBootstrapAdmin(): Promise<{
  created: boolean;
  configured: boolean;
}> {
  const existingActiveAdmin = await prisma.user.findFirst({
    where: {
      email: { not: SYSTEM_USER_EMAIL },
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
    },
    select: { id: true }
  });

  if (existingActiveAdmin) {
    return { created: false, configured: true };
  }

  const email = String(process.env.INITIAL_ADMIN_EMAIL ?? "").trim();
  const password = String(process.env.INITIAL_ADMIN_PASSWORD ?? "");
  const name =
    String(process.env.INITIAL_ADMIN_NAME ?? "").trim() || "Administrador";

  if (!email || email.toLowerCase() === SYSTEM_USER_EMAIL) {
    return { created: false, configured: false };
  }

  let passwordHash: string;

  try {
    passwordHash = await hashPassword(password);
  } catch {
    return { created: false, configured: false };
  }

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 }
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE,
      mustChangePassword: true
    }
  });

  return { created: true, configured: true };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  if (!input.name.trim()) {
    throw new Error("Nome e obrigatorio.");
  }

  const email = input.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Email e obrigatorio.");
  }

  if (email === SYSTEM_USER_EMAIL) {
    throw new Error("Email reservado para uso interno do sistema.");
  }

  if (!Object.values(UserRole).includes(input.role)) {
    throw new Error("Perfil de usuario invalido.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw new Error("Email ja cadastrado.");
  }

  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: RecordStatus.ACTIVE,
      mustChangePassword: true
    }
  });
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const lockUntil = new Date(
    now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000
  );

  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          passwordHash: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          mustChangePassword: true,
          mfaEnabled: true
        }
      })
    : null;

  const isLocked =
    Boolean(user?.lockedUntil) &&
    (user?.lockedUntil?.getTime() ?? 0) > now.getTime();
  const hashToCompare = user?.passwordHash.startsWith("$2")
    ? user.passwordHash
    : DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, hashToCompare);

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    isLocked ||
    !passwordMatches
  ) {
    if (user && user.status === RecordStatus.ACTIVE && !isLocked) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const willLock = failedLoginAttempts >= LOGIN_LOCK_THRESHOLD;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          lockedUntil: willLock ? lockUntil : null
        }
      });

      await recordSecurityEvent({
        eventType: SecurityEventType.LOGIN_FAILURE,
        subjectUserId: user.id,
        email,
        metadata: {
          failedLoginAttempts
        }
      });

      if (willLock) {
        await recordSecurityEvent({
          eventType: SecurityEventType.LOGIN_LOCKOUT,
          subjectUserId: user.id,
          email,
          metadata: {
            lockedUntil: lockUntil.toISOString()
          }
        });
      }
    } else {
      await recordSecurityEvent({
        eventType: SecurityEventType.LOGIN_FAILURE,
        subjectUserId: user?.id ?? null,
        email,
        metadata: {
          reason: isLocked ? "locked" : "invalid_credentials"
        }
      });
    }

    return null;
  }

  const mfaRequired = user.role === UserRole.ADMIN && user.mfaEnabled;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      ...(mfaRequired ? {} : { lastLoginAt: now })
    },
    select: {
      id: true,
      email: true,
      role: true,
      mustChangePassword: true,
      mfaEnabled: true
    }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.LOGIN_SUCCESS,
    actorUserId: user.id,
    subjectUserId: user.id,
    email: user.email,
    metadata: {
      mfaRequired
    }
  });

  return updatedUser;
}

export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  if (input.newPassword !== input.confirmPassword) {
    throw new Error("Confirmacao da nova senha nao confere.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      passwordHash: true,
      status: true
    }
  });

  const currentPasswordMatches =
    Boolean(user?.passwordHash.startsWith("$2")) &&
    (await bcrypt.compare(input.currentPassword, user?.passwordHash ?? ""));

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    !currentPasswordMatches
  ) {
    throw new Error("Senha atual invalida.");
  }

  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    throw new Error("A nova senha deve ser diferente da senha atual.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 }
    }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.PASSWORD_CHANGE,
    actorUserId: user.id,
    subjectUserId: user.id
  });
}

export async function resetUserPassword(input: {
  targetUserId: string;
  password: string;
}) {
  await prisma.user.update({
    where: { id: input.targetUserId },
    data: {
      passwordHash: await hashPassword(input.password),
      mustChangePassword: true,
      passwordChangedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 }
    }
  });
}
