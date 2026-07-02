"use server";

import { revalidatePath } from "next/cache";

import {
  applyInitialImport,
  simulateInitialImport
} from "@/services/imports.service";
import { requireActionPermission } from "@/lib/auth";

import type { ImportActionState } from "./types";

async function importInput(formData: FormData) {
  const fileName =
    String(formData.get("fileName") ?? "").trim() || "cadastro-vinhos.csv";
  const rawText = String(formData.get("rawText") ?? "").trim();

  return { fileName, rawText };
}

export async function simulateImportAction(
  _previousState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  try {
    await requireActionPermission("imports:write");

    const input = await importInput(formData);
    const result = await simulateInitialImport(input);

    return {
      mode: "simulation",
      message: result.canApply
        ? "Simulacao concluida. O cadastro pode ser aplicado."
        : "Simulacao concluida com pendencias.",
      result,
      batchId: null
    };
  } catch (error) {
    return {
      mode: "error",
      message:
        error instanceof Error
          ? error.message
          : "Falha ao simular cadastro.",
      result: null,
      batchId: null
    };
  }
}

export async function applyImportAction(
  _previousState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  try {
    const input = await importInput(formData);
    const user = await requireActionPermission("imports:write");
    const result = await applyInitialImport({ ...input, userId: user.id });

    if (!result.applied) {
      return {
        mode: "simulation",
        message: "Cadastro nao aplicado porque ainda existem pendencias.",
        result,
        batchId: result.batchId
      };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/busca");
    revalidatePath("/leitura");
    revalidatePath("/produtos");
    revalidatePath("/fornecedores");
    revalidatePath("/movimentacoes");
    revalidatePath("/relatorios");
    revalidatePath("/relatorios/estoque-atual");
    revalidatePath("/relatorios/movimentacoes");
    revalidatePath("/relatorios/produtos-parados");
    revalidatePath("/importacao");

    return {
      mode: "applied",
      message: "Cadastro aplicado com sucesso.",
      result,
      batchId: result.batchId
    };
  } catch (error) {
    return {
      mode: "error",
      message:
        error instanceof Error
          ? error.message
          : "Falha ao aplicar cadastro.",
      result: null,
      batchId: null
    };
  }
}
