import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RecordStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertPermission,
  hasPermission,
  type Permission
} from "@/lib/permissions";

const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-estoque_session"
    : "estoque_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 4;
const MFA_CHALLENGE_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-estoque_mfa_challenge"
    : "estoque_mfa_challenge";
const MFA_CHALLENGE_MAX_AGE_SECONDS = 60 * 10;

type SessionPayload = {
  purpose?: "session";
  userId: string;
  expiresAt: number;
  sessionVersion: number;
};

type MfaChallengePayload = {
  purpose: "mfa_challenge";
  userId: string;
  expiresAt: number;
  sessionVersion: number;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
};

export type MfaChallenge = {
  userId: string;
  email: string;
  mustChangePassword: boolean;
};

type AuthRequirementOptions = {
  allowPasswordChangeRequired?: boolean;
  allowMfaSetupRequired?: boolean;
};

function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function isAuthConfigured(): boolean {
  return authSecret().length >= 32;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string): string {
  return base64Url(createHmac("sha256", authSecret()).update(payload).digest());
}

function decodeSignedPayload<T>(token: string): T | null {
  if (!isAuthConfigured()) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function verifySessionToken(token: string): SessionPayload | null {
  const decoded = decodeSignedPayload<SessionPayload>(token);

  if (
    !decoded ||
    (decoded.purpose && decoded.purpose !== "session") ||
    !decoded.userId ||
    decoded.expiresAt < Date.now() ||
    typeof decoded.sessionVersion !== "number"
  ) {
    return null;
  }

  return decoded;
}

function verifyMfaChallengeToken(token: string): MfaChallengePayload | null {
  const decoded = decodeSignedPayload<MfaChallengePayload>(token);

  if (
    !decoded ||
    decoded.purpose !== "mfa_challenge" ||
    !decoded.userId ||
    decoded.expiresAt < Date.now() ||
    typeof decoded.sessionVersion !== "number"
  ) {
    return null;
  }

  return decoded;
}

function signedToken(payload: object): string {
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function requiresAdminMfaSetup(
  user: Pick<AuthenticatedUser, "role" | "mfaEnabled" | "mustChangePassword">
): boolean {
  return (
    user.role === UserRole.ADMIN && !user.mfaEnabled && !user.mustChangePassword
  );
}

export function authenticatedHomePath(
  user: Pick<AuthenticatedUser, "role" | "mfaEnabled" | "mustChangePassword">
): string {
  if (user.mustChangePassword) {
    return "/minha-conta/senha";
  }

  if (requiresAdminMfaSetup(user)) {
    return "/minha-conta/mfa";
  }

  return "/";
}

export async function createSession(userId: string): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      sessionVersion: true
    }
  });

  if (!user || user.status !== RecordStatus.ACTIVE) {
    throw new Error("Usuario inativo ou inexistente.");
  }

  const token = signedToken({
    purpose: "session",
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    sessionVersion: user.sessionVersion
  } satisfies SessionPayload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function createMfaChallenge(userId: string): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      role: true,
      mfaEnabled: true,
      sessionVersion: true
    }
  });

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    user.role !== UserRole.ADMIN ||
    !user.mfaEnabled
  ) {
    throw new Error("Desafio MFA invalido.");
  }

  const token = signedToken({
    purpose: "mfa_challenge",
    userId,
    expiresAt: Date.now() + MFA_CHALLENGE_MAX_AGE_SECONDS * 1000,
    sessionVersion: user.sessionVersion
  } satisfies MfaChallengePayload);
  const cookieStore = await cookies();

  cookieStore.set(MFA_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MFA_CHALLENGE_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearMfaChallenge(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(MFA_CHALLENGE_COOKIE);
  cookieStore.delete("estoque_mfa_challenge");
  cookieStore.delete("__Host-estoque_mfa_challenge");
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("estoque_session");
  cookieStore.delete("__Host-estoque_session");
  cookieStore.delete(MFA_CHALLENGE_COOKIE);
  cookieStore.delete("estoque_mfa_challenge");
  cookieStore.delete("__Host-estoque_mfa_challenge");
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      mfaEnabled: true,
      sessionVersion: true
    }
  });

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    user.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    mfaEnabled: user.mfaEnabled
  };
}

export async function getMfaChallenge(): Promise<MfaChallenge | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value;
  const challenge = token ? verifyMfaChallengeToken(token) : null;

  if (!challenge) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      mfaEnabled: true,
      sessionVersion: true
    }
  });

  if (
    !user ||
    user.status !== RecordStatus.ACTIVE ||
    user.role !== UserRole.ADMIN ||
    !user.mfaEnabled ||
    user.sessionVersion !== challenge.sessionVersion
  ) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    mustChangePassword: user.mustChangePassword
  };
}

export async function requirePageUser(
  options: AuthRequirementOptions = {}
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    redirect("/minha-conta/senha");
  }

  if (requiresAdminMfaSetup(user) && !options.allowMfaSetupRequired) {
    redirect("/minha-conta/mfa");
  }

  return user;
}

export async function requirePagePermission(
  permission: Permission,
  options: AuthRequirementOptions = {}
): Promise<AuthenticatedUser> {
  const user = await requirePageUser(options);

  if (!hasPermission(user.role, permission)) {
    redirect("/acesso-negado");
  }

  return user;
}

export async function requireActionUser(
  options: AuthRequirementOptions = {}
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new Error("Altere sua senha antes de continuar.");
  }

  if (requiresAdminMfaSetup(user) && !options.allowMfaSetupRequired) {
    throw new Error("Configure MFA antes de continuar.");
  }

  return user;
}

export async function requireActionPermission(
  permission: Permission,
  options: AuthRequirementOptions = {}
): Promise<AuthenticatedUser> {
  const user = await requireActionUser(options);
  assertPermission(user.role, permission);
  return user;
}
