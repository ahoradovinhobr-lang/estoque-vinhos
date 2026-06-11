"use client";

import Link from "next/link";
import { DatabaseZap, Loader2, Search } from "lucide-react";
import { useState } from "react";

import type { GtinLookupResult } from "@/services/gtin.service";

type GtinLookupPanelProps = {
  barcode: string;
  canCreateProduct: boolean;
};

function productUrl(result: GtinLookupResult): string {
  const params = new URLSearchParams({ barcode: result.gtin });

  if (result.name) {
    params.set("name", result.name);
  }

  if (result.country) {
    params.set("country", result.country);
  }

  if (result.imageUrl) {
    params.set("photoUrl", result.imageUrl);
  }

  if (result.productType) {
    params.set("type", result.productType);
  }

  if (result.wineColor) {
    params.set("wineColor", result.wineColor);
  }

  if (result.grape) {
    params.set("grape", result.grape);
  }

  if (result.vintage) {
    params.set("vintage", result.vintage);
  }

  return `/produtos?${params.toString()}`;
}

const productTypeLabels: Record<NonNullable<GtinLookupResult["productType"]>, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<NonNullable<GtinLookupResult["wineColor"]>, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

function resultDetails(result: GtinLookupResult): string {
  return [
    result.brand,
    result.country,
    result.productType ? productTypeLabels[result.productType] : null,
    result.wineColor ? wineColorLabels[result.wineColor] : null,
    result.grape ? `Uva ${result.grape}` : null,
    result.vintage ? `Safra ${result.vintage}` : null,
    result.provider
  ]
    .filter(Boolean)
    .join(" - ");
}

function responseErrorMessage(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "Falha ao consultar GTIN.";
}

function resultMessageClassName(status: GtinLookupResult["status"]): string {
  if (status === "error") {
    return "text-red-700";
  }

  if (status === "invalid") {
    return "text-amber-700";
  }

  return "text-stone-600";
}

export function GtinLookupPanel({
  barcode,
  canCreateProduct
}: GtinLookupPanelProps) {
  const [result, setResult] = useState<GtinLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function lookup() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/barcodes/gtin/${encodeURIComponent(barcode)}`
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseErrorMessage(data));
      }

      setResult(data as GtinLookupResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao consultar GTIN."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <DatabaseZap aria-hidden className="h-4 w-4 text-cellar" />
            Consulta GTIN
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Busca dados externos do codigo para acelerar o cadastro.
          </p>
        </div>
        <button
          type="button"
          onClick={lookup}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Search aria-hidden className="h-4 w-4" />
          )}
          Consultar
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-md border border-stone-200 bg-white p-3">
          {result.status === "found" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded-md border border-stone-200 object-cover"
                  />
                ) : null}
                <div>
                  <p className="font-medium text-ink">
                    {result.name ?? "Produto encontrado"}
                  </p>
                  <p className="text-sm text-stone-600">
                    {resultDetails(result)}
                  </p>
                </div>
              </div>
              {canCreateProduct ? (
                <Link
                  href={productUrl(result)}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
                >
                  Usar no cadastro
                </Link>
              ) : null}
            </div>
          ) : (
            <p className={`text-sm ${resultMessageClassName(result.status)}`}>
              {result.message ?? "GTIN nao encontrado."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
