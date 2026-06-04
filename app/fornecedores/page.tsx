import { RecordStatus } from "@prisma/client";
import { Plus, RotateCcw, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import {
  createSupplier,
  inactivateSupplier,
  reactivateSupplier
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Cadastro</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Fornecedores</h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-ink">
          Novo fornecedor
        </h3>
        <form action={createSupplier} className="grid gap-3 lg:grid-cols-6">
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
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Documento
            </span>
            <input
              name="document"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Telefone
            </span>
            <input
              name="phone"
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
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-5">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observacoes
            </span>
            <input
              name="notes"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end">
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">
            Fornecedores cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-stone-500" colSpan={4}>
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{supplier.name}</p>
                      <p className="text-stone-500">{supplier.document || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <p>{supplier.phone || "-"}</p>
                      <p>{supplier.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                        {supplier.status === RecordStatus.ACTIVE
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form
                        action={
                          supplier.status === RecordStatus.ACTIVE
                            ? inactivateSupplier
                            : reactivateSupplier
                        }
                      >
                        <input type="hidden" name="id" value={supplier.id} />
                        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                          {supplier.status === RecordStatus.ACTIVE ? (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
