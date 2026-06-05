import { RecordStatus, UserRole } from "@prisma/client";
import { Plus, RotateCcw, Users, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  createUserAction,
  inactivateUserAction,
  reactivateUserAction
} from "./actions";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  ESTOQUE: "Estoque",
  CONSULTA: "Consulta"
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePagePermission("users:write");

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Administracao</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Usuarios</h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-ink">Novo usuario</h3>
        <form action={createUserAction} className="grid gap-3 lg:grid-cols-8">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Nome
            </span>
            <input
              name="name"
              required
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Perfil
            </span>
            <select
              name="role"
              required
              defaultValue={UserRole.ESTOQUE}
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Senha inicial
            </span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end">
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
              <Plus aria-hidden className="h-4 w-4" />
              Criar
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <Users aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Usuarios cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-stone-100">
                  <td className="px-4 py-3 font-medium text-ink">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{user.email}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {roleLabels[user.role]}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {user.status === RecordStatus.ACTIVE ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={
                        user.status === RecordStatus.ACTIVE
                          ? inactivateUserAction
                          : reactivateUserAction
                      }
                    >
                      <input type="hidden" name="id" value={user.id} />
                      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                        {user.status === RecordStatus.ACTIVE ? (
                          <>
                            <XCircle aria-hidden className="h-4 w-4" />
                            Inativar
                          </>
                        ) : (
                          <>
                            <RotateCcw aria-hidden className="h-4 w-4" />
                            Reativar
                          </>
                        )}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
