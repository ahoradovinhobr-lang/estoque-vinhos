import { Barcode, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

export default function SearchPage() {
  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Busca rapida</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Localizar vinho no estoque
        </h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <label
          htmlFor="search"
          className="mb-2 block text-sm font-medium text-stone-700"
        >
          Nome, SKU ou codigo de barras
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            />
            <input
              id="search"
              autoFocus
              placeholder="Escaneie ou digite para buscar"
              className="h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]">
            <Barcode aria-hidden className="h-4 w-4" />
            Buscar
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
        Os resultados aparecerao aqui com quantidade total e locais de armazenamento.
      </section>
    </AppShell>
  );
}
