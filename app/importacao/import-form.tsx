"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, FileText, Upload, XCircle } from "lucide-react";

import { applyImportAction, simulateImportAction } from "./actions";
import {
  initialImportActionState,
  type ImportActionState
} from "./types";

const exampleText = `name\ttype\twine_color\tgrape\tcountry\tsupplier\tvintage\tbarcode\tsale_price\tphoto_url\tnotes
Vinho Exemplo Malbec\twine\tred\tMalbec\tArgentina\tFornecedor Exemplo\t2022\t4006381333931\t79,90\thttps://example.com/vinho.jpg\tCadastro inicial`;

function ResultSummary({ state }: { state: ImportActionState }) {
  if (!state.result) {
    return null;
  }

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Linhas</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.totalRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Validas</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.validRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Com erro</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.errorRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Criadas</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.createdRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Atualizadas</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.updatedRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Ignoradas</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {state.result.ignoredRows}
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Hash</p>
        <p className="mt-2 break-all text-sm font-semibold text-ink">
          {state.result.fileHash.slice(0, 16)}
        </p>
      </div>
    </section>
  );
}

function ResultTable({ state }: { state: ImportActionState }) {
  if (!state.result) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <FileText aria-hidden className="h-4 w-4 text-cellar" />
        <h3 className="text-base font-semibold text-ink">
          Relatorio da importacao
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
              <th className="px-4 py-3 font-medium">Linha</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Acao</th>
              <th className="px-4 py-3 font-medium">Mensagens</th>
            </tr>
          </thead>
          <tbody>
            {state.result.rows.map((row) => (
              <tr key={`${row.rowNumber}-${row.name}-${row.barcode ?? ""}`} className="border-b border-stone-100">
                <td className="px-4 py-3">{row.rowNumber}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                    {row.status === "valid" ? (
                      <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-olive" />
                    ) : (
                      <XCircle aria-hidden className="h-3.5 w-3.5 text-brass" />
                    )}
                    {row.status === "valid" ? "Valida" : "Erro"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-ink">{row.barcode || "-"}</td>
                <td className="px-4 py-3 text-stone-600">{row.name || "-"}</td>
                <td className="px-4 py-3 text-stone-600">{row.action}</td>
                <td className="px-4 py-3 text-stone-600">
                  {[...row.errors, ...row.warnings].join(" | ") || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ImportForm() {
  const [activeSource, setActiveSource] = useState<"simulation" | "apply">(
    "simulation"
  );
  const [simulationState, simulateAction, isSimulating] = useActionState(
    simulateImportAction,
    initialImportActionState
  );
  const [applyState, applyAction, isApplying] = useActionState(
    applyImportAction,
    initialImportActionState
  );
  const activeState =
    activeSource === "apply" && applyState.mode !== "idle"
      ? applyState
      : simulationState;
  const canApply =
    simulationState.result?.canApply &&
    activeSource === "simulation" &&
    !isSimulating &&
    !isApplying;

  return (
    <>
      <section className="rounded-md border border-stone-200 bg-white p-4">
        <form
          action={simulateAction}
          className="grid gap-3"
          onSubmit={() => setActiveSource("simulation")}
        >
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Nome do arquivo
            </span>
            <input
              name="fileName"
              defaultValue="cadastro-vinhos.csv"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Conteudo CSV/TSV
            </span>
            <textarea
              name="rawText"
              required
              rows={12}
              defaultValue={exampleText}
              className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              disabled={isSimulating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText aria-hidden className="h-4 w-4" />
              {isSimulating ? "Simulando..." : "Simular cadastro"}
            </button>
          </div>
        </form>
      </section>

      {activeState.message ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium text-ink">{activeState.message}</p>
          {activeState.batchId ? (
            <p className="mt-1 text-sm text-stone-600">
              Lote {activeState.batchId.slice(0, 8)}
            </p>
          ) : null}
        </section>
      ) : null}

      <ResultSummary state={activeState} />

      {simulationState.result ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white p-4">
          <form action={applyAction} onSubmit={() => setActiveSource("apply")}>
            <input
              type="hidden"
              name="fileName"
              value={simulationState.result.fileName}
            />
            <input
              type="hidden"
              name="rawText"
              value={simulationState.result.rawText}
            />
            <button
              disabled={!canApply}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload aria-hidden className="h-4 w-4" />
              {isApplying ? "Aplicando..." : "Aplicar cadastro definitivo"}
            </button>
          </form>
        </section>
      ) : null}

      <ResultTable state={activeState} />
    </>
  );
}
