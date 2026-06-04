import { RecordStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const SYSTEM_USER_EMAIL = "operador@estoque.local";

export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    create: {
      name: "Operador do sistema",
      email: SYSTEM_USER_EMAIL,
      passwordHash: "system-user-without-login",
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
    },
    update: {
      name: "Operador do sistema",
      role: UserRole.ADMIN,
      status: RecordStatus.ACTIVE
    },
    select: { id: true }
  });

  return user.id;
}
