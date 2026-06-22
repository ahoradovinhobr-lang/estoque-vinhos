import { RecordStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SYSTEM_USER_EMAIL } from "@/lib/system-user";

export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    create: {
      name: "Operador do sistema",
      email: SYSTEM_USER_EMAIL,
      passwordHash: "system-user-without-login",
      role: UserRole.ESTOQUE,
      status: RecordStatus.ACTIVE
    },
    update: {
      name: "Operador do sistema",
      role: UserRole.ESTOQUE,
      status: RecordStatus.ACTIVE
    },
    select: { id: true }
  });

  return user.id;
}
