import { UserRole } from "@prisma/client";

export type Permission =
  | "products:write"
  | "locations:write"
  | "suppliers:write"
  | "stock:read"
  | "stock:write"
  | "stock:reverse"
  | "inventory:audit"
  | "reports:read"
  | "users:write"
  | "security:read"
  | "imports:write";

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    "products:write",
    "locations:write",
    "suppliers:write",
    "stock:read",
    "stock:write",
    "stock:reverse",
    "inventory:audit",
    "reports:read",
    "users:write",
    "security:read",
    "imports:write"
  ],
  [UserRole.ESTOQUE]: [
    "stock:read",
    "stock:write",
    "inventory:audit",
    "reports:read",
    "imports:write"
  ],
  [UserRole.CONSULTA]: ["stock:read"]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permissao insuficiente: ${permission}`);
  }
}
