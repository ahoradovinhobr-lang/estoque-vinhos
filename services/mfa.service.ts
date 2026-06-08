import bcrypt from "bcryptjs";
import { RecordStatus, SecurityEventType, UserRole } from "@prisma/client";

import {
  createOtpAuthUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  normalizeRecoveryCode,
  verifyTotpCode
} from "@/lib/mfa";
import { prisma } from "@/lib/prisma";
import { recordSecurityEvent } from "@/services/security-events.service";

export const MFA_LOCK_THRESHOLD = 5;
export const MFA_LOCK_MINUTES = 15;
const MFA_SETUP_TTL_MINUTES = 30;

type MfaUserForFailure = {
  id: string;
  email: string;
  mfaFailedAttempts: number;
  mfaLockedUntil: Date | null;
};

async function createQrCodeDataUrl(otpAuthUri: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");

    return QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220
    });
  } catch {
    return null;
  }
}

function setupExpired(createdAt: Date | null): boolean {
  if (!createdAt) {
    return true;
  }

  const expiresAt =
    createdAt.getTime() + MFA_SETUP_TTL_MINUTES * 60 * 1000;

  return expiresAt < Date.now();
}

async function hashRecoveryCodes(codes: string[]) {
  return Promise.all(
    codes.map(async (code) => ({
      code,
      codeHash: await bcrypt.hash(normalizeRecoveryCode(code), 12)
    }))
  );
}

async function recordMfaFailure(input: {
  user: MfaUserForFailure;
  reason: string;
}) {
  const now = new Date();
  const isLocked =
    Boolean(input.user.mfaLockedUntil) &&
    (input.user.mfaLockedUntil?.getTime() ?? 0) > now.getTime();

  if (isLocked) {
    await recordSecurityEvent({
      eventType: SecurityEventType.MFA_FAILURE,
      subjectUserId: input.user.id,
      email: input.user.email,
      metadata: {
        reason: "locked"
      }
    });
    return;
  }

  const failedAttempts = input.user.mfaFailedAttempts + 1;
  const willLock = failedAttempts >= MFA_LOCK_THRESHOLD;
  const lockedUntil = new Date(
    now.getTime() + MFA_LOCK_MINUTES * 60 * 1000
  );

  await prisma.user.update({
    where: { id: input.user.id },
    data: {
      mfaFailedAttempts: failedAttempts,
      mfaLockedUntil: willLock ? lockedUntil : null
    }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.MFA_FAILURE,
    subjectUserId: input.user.id,
    email: input.user.email,
    metadata: {
      reason: input.reason,
      failedAttempts,
      lockedUntil: willLock ? lockedUntil.toISOString() : null
    }
  });
}

export async function getMfaAccountStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      mfaEnabled: true,
      mfaConfirmedAt: true,
      mfaLockedUntil: true,
      _count: {
        select: {
          mfaRecoveryCodes: {
            where: { usedAt: null }
          }
        }
      }
    }
  });

  if (!user) {
    throw new Error("Usuario nao encontrado.");
  }

  return {
    role: user.role,
    enabled: user.mfaEnabled,
    confirmedAt: user.mfaConfirmedAt,
    lockedUntil: user.mfaLockedUntil,
    recoveryCodesRemaining: user._count.mfaRecoveryCodes
  };
}

export async function ensureMfaSetup(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      mfaEnabled: true,
      mfaPendingSecretEncrypted: true,
      mfaPendingSecretCreatedAt: true
    }
  });

  if (!user || user.status !== RecordStatus.ACTIVE) {
    throw new Error("Usuario inativo ou inexistente.");
  }

  if (user.role !== UserRole.ADMIN) {
    throw new Error("MFA e obrigatorio apenas para administradores.");
  }

  if (user.mfaEnabled) {
    return null;
  }

  let secret: string;

  if (
    user.mfaPendingSecretEncrypted &&
    !setupExpired(user.mfaPendingSecretCreatedAt)
  ) {
    secret = decryptMfaSecret(user.mfaPendingSecretEncrypted);
  } else {
    secret = generateTotpSecret();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaPendingSecretEncrypted: encryptMfaSecret(secret),
        mfaPendingSecretCreatedAt: new Date(),
        mfaFailedAttempts: 0,
        mfaLockedUntil: null
      }
    });
  }

  const otpAuthUri = createOtpAuthUri({
    email: user.email,
    secret
  });

  return {
    secret,
    otpAuthUri,
    qrCodeDataUrl: await createQrCodeDataUrl(otpAuthUri)
  };
}

export async function enableMfaForCurrentUser(input: {
  userId: string;
  code: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      mfaEnabled: true,
      mfaPendingSecretEncrypted: true,
      mfaFailedAttempts: true,
      mfaLockedUntil: true
    }
  });

  if (!user || user.status !== RecordStatus.ACTIVE) {
    throw new Error("Usuario inativo ou inexistente.");
  }

  if (user.role !== UserRole.ADMIN) {
    throw new Error("MFA e obrigatorio apenas para administradores.");
  }

  if (user.mfaEnabled) {
    throw new Error("MFA ja esta ativo.");
  }

  if (!user.mfaPendingSecretEncrypted) {
    throw new Error("Inicie a configuracao do MFA novamente.");
  }

  const isLocked =
    Boolean(user.mfaLockedUntil) &&
    (user.mfaLockedUntil?.getTime() ?? 0) > Date.now();

  if (isLocked) {
    await recordMfaFailure({ user, reason: "locked" });
    throw new Error("MFA temporariamente bloqueado. Tente novamente depois.");
  }

  const secret = decryptMfaSecret(user.mfaPendingSecretEncrypted);
  const verification = verifyTotpCode({
    secret,
    code: input.code,
    lastUsedCounter: null
  });

  if (!verification.valid) {
    await recordMfaFailure({ user, reason: "setup_invalid_code" });
    throw new Error("Codigo MFA invalido.");
  }

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);

  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({
      where: { userId: user.id }
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: user.mfaPendingSecretEncrypted,
        mfaPendingSecretEncrypted: null,
        mfaPendingSecretCreatedAt: null,
        mfaConfirmedAt: new Date(),
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        mfaLastUsedCounter: verification.counter,
        sessionVersion: { increment: 1 }
      }
    });

    await tx.mfaRecoveryCode.createMany({
      data: recoveryCodeHashes.map((code) => ({
        userId: user.id,
        codeHash: code.codeHash
      }))
    });
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.MFA_ENABLED,
    actorUserId: user.id,
    subjectUserId: user.id,
    email: user.email
  });

  return recoveryCodes;
}

async function useRecoveryCode(input: {
  userId: string;
  code: string;
}): Promise<boolean> {
  const normalizedCode = normalizeRecoveryCode(input.code);

  if (!/^[A-Z0-9]{12}$/.test(normalizedCode)) {
    return false;
  }

  const recoveryCodes = await prisma.mfaRecoveryCode.findMany({
    where: {
      userId: input.userId,
      usedAt: null
    }
  });

  for (const recoveryCode of recoveryCodes) {
    if (await bcrypt.compare(normalizedCode, recoveryCode.codeHash)) {
      const result = await prisma.mfaRecoveryCode.updateMany({
        where: {
          id: recoveryCode.id,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      });

      return result.count === 1;
    }
  }

  return false;
}

export async function verifyMfaForLogin(input: {
  userId: string;
  code: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      status: true,
      mfaEnabled: true,
      mfaSecretEncrypted: true,
      mfaFailedAttempts: true,
      mfaLockedUntil: true,
      mfaLastUsedCounter: true
    }
  });

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    !user.mfaEnabled ||
    !user.mfaSecretEncrypted
  ) {
    return {
      ok: false,
      message: "Desafio MFA invalido. Faca login novamente."
    };
  }

  const isLocked =
    Boolean(user.mfaLockedUntil) &&
    (user.mfaLockedUntil?.getTime() ?? 0) > Date.now();

  if (isLocked) {
    await recordMfaFailure({ user, reason: "locked" });
    return {
      ok: false,
      message: "MFA temporariamente bloqueado. Tente novamente depois."
    };
  }

  const secret = decryptMfaSecret(user.mfaSecretEncrypted);
  const verification = verifyTotpCode({
    secret,
    code: input.code,
    lastUsedCounter: user.mfaLastUsedCounter
  });

  if (verification.valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        mfaLastUsedCounter: verification.counter,
        lastLoginAt: new Date()
      }
    });

    await recordSecurityEvent({
      eventType: SecurityEventType.MFA_SUCCESS,
      actorUserId: user.id,
      subjectUserId: user.id,
      email: user.email,
      metadata: {
        method: "totp"
      }
    });

    return { ok: true };
  }

  if (await useRecoveryCode({ userId: user.id, code: input.code })) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    await recordSecurityEvent({
      eventType: SecurityEventType.RECOVERY_CODE_USED,
      actorUserId: user.id,
      subjectUserId: user.id,
      email: user.email
    });

    await recordSecurityEvent({
      eventType: SecurityEventType.MFA_SUCCESS,
      actorUserId: user.id,
      subjectUserId: user.id,
      email: user.email,
      metadata: {
        method: "recovery_code"
      }
    });

    return { ok: true };
  }

  await recordMfaFailure({ user, reason: "invalid_code" });

  return {
    ok: false,
    message: "Codigo MFA invalido."
  };
}

export async function regenerateOwnRecoveryCodes(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      mfaEnabled: true
    }
  });

  if (!user || user.status !== RecordStatus.ACTIVE || !user.mfaEnabled) {
    throw new Error("MFA precisa estar ativo para gerar novos codigos.");
  }

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);

  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({
      where: { userId: user.id }
    });

    await tx.mfaRecoveryCode.createMany({
      data: recoveryCodeHashes.map((code) => ({
        userId: user.id,
        codeHash: code.codeHash
      }))
    });
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.MFA_RESET,
    actorUserId: user.id,
    subjectUserId: user.id,
    email: user.email,
    metadata: {
      reason: "recovery_codes_regenerated"
    }
  });

  return recoveryCodes;
}

export async function resetUserMfa(input: {
  actorUserId: string;
  targetUserId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({
      where: { userId: input.targetUserId }
    });

    await tx.user.update({
      where: { id: input.targetUserId },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaPendingSecretEncrypted: null,
        mfaPendingSecretCreatedAt: null,
        mfaConfirmedAt: null,
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        mfaLastUsedCounter: null,
        sessionVersion: { increment: 1 }
      }
    });
  });

  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      email: true
    }
  });

  await recordSecurityEvent({
    eventType: SecurityEventType.MFA_RESET,
    actorUserId: input.actorUserId,
    subjectUserId: input.targetUserId,
    email: targetUser?.email ?? null
  });
}
