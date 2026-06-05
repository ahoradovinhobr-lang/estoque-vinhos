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

const SESSION_COOKIE = "estoque_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

function verifyToken(token: string): SessionPayload | null {
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
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionPayload;

    if (!decoded.userId || decoded.expiresAt < Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  const payload = base64Url(
    JSON.stringify({
      userId,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
    } satisfies SessionPayload)
  );
  const token = `${payload}.${signPayload(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;

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
      status: true
    }
  });

  if (!user || user.status !== RecordStatus.ACTIVE) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function requirePageUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePagePermission(
  permission: Permission
): Promise<AuthenticatedUser> {
  const user = await requirePageUser();

  if (!hasPermission(user.role, permission)) {
    redirect("/acesso-negado");
  }

  return user;
}

export async function requireActionUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  return user;
}

export async function requireActionPermission(
  permission: Permission
): Promise<AuthenticatedUser> {
  const user = await requireActionUser();
  assertPermission(user.role, permission);
  return user;
}
