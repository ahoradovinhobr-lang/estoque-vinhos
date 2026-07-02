import Link from "next/link";
import { ImportStatus } from "@prisma/client";
import { Upload } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ImportForm } from "./import-form";

const importStatusLabels: Record<ImportStatus, string> = {
  DRAFT: "Rascunho",
  VALIDATED: "Validado",
  IMPORTED: "Importado",
  FAILED: "Falhou"
};

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requirePagePermission("imports:write");

  const batches = await prisma.importBatch.findMany({
    include: {
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cellar">Preparacao</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Importacao de cadastros
          </h2>
        </div>
        <Link
          href="/relatorios"
          className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Relatorios
        </Link>
      </header>

      <section className="mb-6 rounded-md border border-stone-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Upload aria-hidden className="mt-0.5 h-5 w-5 text-cellar" />
          <div>
            <h3 className="text-base font-semibold text-ink">
              Formato esperado
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Cole dados CSV, TSV ou conteudo copiado de planilha com as colunas:
              name, type, wine_color, grape, country, supplier, vintage,
              barcode, sale_price, photo_url e notes. Quantidade e local nao
              sao importados neste fluxo.
            </p>
          </div>
        </div>
      </section>

      <ImportForm />

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">
            Importacoes recentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Arquivo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Produtos</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={5}
                  >
                    Nenhuma importacao aplicada.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{batch.fileName}</p>
                      <p className="break-all text-stone-500">
                        {batch.fileHash.slice(0, 24)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {importStatusLabels[batch.status]}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {batch.totalRows}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {batch.user.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {batch.createdAt.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo"
                      })}
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
