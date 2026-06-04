import { LocationType, RecordStatus } from "@prisma/client";
import { MapPin, Plus, RotateCcw, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

import {
  createLocation,
  inactivateLocation,
  reactivateLocation
} from "./actions";

const locationTypeLabels: Record<LocationType, string> = {
  SHELF: "Prateleira",
  WOODEN_CELLAR: "Adega de madeira",
  DISPLAY: "Expositor",
  OTHER: "Outro"
};

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const locations = await prisma.storageLocation.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }]
  });

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Cadastro</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Locais de armazenamento
        </h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-ink">Novo local</h3>
        <form action={createLocation} className="grid gap-3 lg:grid-cols-6">
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Codigo
            </span>
            <input
              name="code"
              required
              placeholder="P01-A"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm uppercase outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Nome
            </span>
            <input
              name="name"
              required
              placeholder="Prateleira 01"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Tipo
            </span>
            <select
              name="type"
              required
              defaultValue=""
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(locationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar
            </button>
          </div>
          <label className="lg:col-span-6">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Descricao
            </span>
            <input
              name="description"
              placeholder="Ex.: corredor interno, parede esquerda"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">
            Locais cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Codigo</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={5}
                  >
                    Nenhum local cadastrado.
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr key={location.id} className="border-b border-stone-100">
                    <td className="px-4 py-3 font-medium text-ink">
                      {location.code}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{location.name}</p>
                      <p className="text-stone-500">
                        {location.description || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <span className="inline-flex items-center gap-2">
                        <MapPin aria-hidden className="h-4 w-4 text-cellar" />
                        {locationTypeLabels[location.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                        {location.status === RecordStatus.ACTIVE
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form
                        action={
                          location.status === RecordStatus.ACTIVE
                            ? inactivateLocation
                            : reactivateLocation
                        }
                      >
                        <input type="hidden" name="id" value={location.id} />
                        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                          {location.status === RecordStatus.ACTIVE ? (
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
