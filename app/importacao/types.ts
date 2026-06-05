import type { ImportSimulationResult } from "@/services/imports.service";

export type ImportActionState = {
  mode: "idle" | "simulation" | "applied" | "error";
  message: string;
  result: ImportSimulationResult | null;
  batchId?: string | null;
};

export const initialImportActionState: ImportActionState = {
  mode: "idle",
  message: "",
  result: null,
  batchId: null
};
