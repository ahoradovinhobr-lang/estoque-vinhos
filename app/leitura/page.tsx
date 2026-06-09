import Link from "next/link";
import { Barcode, Boxes, ClipboardCheck, Wine } from "lucide-react";
import {
  BarcodeLookupSource,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  lookupBarcodeProducts,
  normalizeBarcode
} from "@/services/barcode.service";

import { BarcodeReader } from "./barcode-reader";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

type BarcodeReadingPageProps = {
  searchParams?: Promise<{
    codigo?: string;
    fonte?: string;
  }>;
};

export const dynamic = "force-dynamic";

function readingSource(value: string | undefined): BarcodeLookupSource {
  if (value === "camera") {
    return BarcodeLookupSource.CAMERA;
  }

  if (value === "input") {
    return BarcodeLookupSource.INPUT;
  }

  return BarcodeLookupSource.DIRECT_URL;
}

export default async function BarcodeReadingPage({
  searchParams
}: BarcodeReadingPageProps) {
  const user = await requirePagePermission("stock:read");
  const params = await searchParams;
  const rawCode = String(params?.codigo ?? "");
  const code = normalizeBarcode(rawCode);
  const canWriteStock = hasPermission(user.role, "stock:write");
  const canAuditInventory = hasPermission(user.role, "inventory:audit");
  const canCreateProduct = hasPermission(user.role, "products:write");
  const lookup = code
    ? await lookupBarcodeProducts({
        barcode: code,
        source: readingSource(params?.fonte),
        userId: user.id
      })
    : null;
  const products = lookup?.products ?? [];

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Leitura</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Codigo de barras
        </h2>
      </header>

      <BarcodeReader initialCode={code} />

      {!code ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Nenhum codigo informado.
        </section>
      ) : products.length === 0 ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-cellar">Nao cadastrado</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{code}</h3>
              <p className="mt-1 text-sm text-stone-500">
                Nenhum produto usa este codigo de barras.
              </p>
            </div>
            {canCreateProduct ? (
              <Link
                href={`/produtos?barcode=${encodeURIComponent(code)}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]"
              >
                <Barcode aria-hidden className="h-4 w-4" />
                Cadastrar produto
              </Link>
            ) : (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                Solicite o cadastro para um usuario com permissao de produtos.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-6 space-y-3">
          {products.length > 1 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mais de um produto usa este codigo. Confirme SKU e safra antes da
              movimentacao.
            </div>
          ) : null}

          {products.map((product) => {
            const balancesWithStock = product.balances
              .filter((balance) => balance.quantity > 0)
              .sort((first, second) =>
                first.storageLocation.code.localeCompare(
                  second.storageLocation.code
                )
              );
            const totalStock = product.balances.reduce(
              (sum, balance) => sum + balance.quantity,
              0
            );
            const characteristics = [
              productTypeLabels[product.type],
              wineColorLabels[product.wineColor],
              `Uva ${product.grape}`,
              product.country,
              product.vintage ? `Safra ${product.vintage}` : null,
              product.supplier?.name
            ]
              .filter((item): item is string => Boolean(item))
              .join(" - ");
            const isActive = product.status === RecordStatus.ACTIVE;

            return (
              <article
                key={product.id}
                className="rounded-md border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">
                        {product.name}
                      </h3>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                        {isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                      <Wine aria-hidden className="h-4 w-4 text-cellar" />
                      {characteristics}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      SKU {product.sku} - Codigo {product.barcode}
                    </p>
                  </div>
                  <div className="rounded-md border border-stone-200 px-4 py-3 text-right">
                    <p className="text-xs font-medium uppercase tracking-normal text-stone-500">
                      Saldo total
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink">
                      {totalStock}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Boxes aria-hidden className="h-4 w-4 text-cellar" />
                      Locais com saldo
                    </p>
                    {balancesWithStock.length === 0 ? (
                      <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
                        Nenhuma unidade em local de estoque.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {balancesWithStock.map((balance) => (
                          <div
                            key={balance.id}
                            className="rounded-md border border-stone-200 px-3 py-2"
                          >
                            <p className="font-medium text-ink">
                              {balance.storageLocation.code}
                            </p>
                            <p className="text-sm text-stone-500">
                              {balance.storageLocation.name}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-cellar">
                              {balance.quantity} unidades
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isActive ? (
                    <div className="grid min-w-44 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      {canWriteStock ? (
                        <>
                          <Link
                            href={`/movimentacoes/entrada?productId=${product.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md bg-cellar px-3 text-sm font-semibold text-white hover:bg-[#4f2733]"
                          >
                            Entrada
                          </Link>
                          <Link
                            href={`/movimentacoes/saida?productId=${product.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Saida
                          </Link>
                          <Link
                            href={`/movimentacoes/transferencia?productId=${product.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Transferir
                          </Link>
                          <Link
                            href={`/movimentacoes/ajuste?productId=${product.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Ajustar
                          </Link>
                        </>
                      ) : null}
                      {canAuditInventory ? (
                        <Link
                          href={`/inventario/novo?productId=${product.id}`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                        >
                          <ClipboardCheck aria-hidden className="h-4 w-4" />
                          Inventario
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
                      Produto inativo.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
