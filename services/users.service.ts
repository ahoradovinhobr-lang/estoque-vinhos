import bcrypt from "bcryptjs";
import { RecordStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "operador@estoque.local";

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

  if (
    !email ||
    email.toLowerCase() === SYSTEM_USER_EMAIL ||
    password.length < 8
  ) {
    return { created: false, configured: false };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
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

  if (input.password.length < 8) {
    throw new Error("Senha deve ter pelo menos 8 caracteres.");
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
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
      status: RecordStatus.ACTIVE
    }
  });
}
