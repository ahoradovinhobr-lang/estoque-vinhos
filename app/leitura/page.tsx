import Link from "next/link";
import { Barcode, Boxes, Wine } from "lucide-react";
import {
  BarcodeLookupSource,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { ProductPhoto } from "@/components/product/product-photo";
import { requirePagePermission } from "@/lib/auth";
import { formatCurrency } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  lookupBarcodeProducts,
  normalizeBarcode,
  type BarcodeLookupProduct
} from "@/services/barcode.service";

import { BarcodeReader } from "./barcode-reader";
import { GtinLookupPanel } from "./gtin-lookup-panel";
import { QuickActionForms } from "./quick-action-forms";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

const successLabels = {
  entrada: "Entrada registrada. Saldo atualizado.",
  saida: "Saida registrada. Saldo atualizado.",
  transferencia: "Transferencia registrada. Saldos atualizados.",
  inventario: "Inventario registrado."
} as const;

type BarcodeReadingPageProps = {
  searchParams?: Promise<{
    codigo?: string;
    q?: string;
    fonte?: string;
    sucesso?: string;
  }>;
};

type ProductOperationalState = "in_stock" | "zero" | "inactive";

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

async function searchProducts(query: string): Promise<BarcodeLookupProduct[]> {
  return prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { grape: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
        { vintage: { contains: query, mode: "insensitive" } },
        { barcode: { contains: query, mode: "insensitive" } },
        {
          supplier: {
            is: {
              name: { contains: query, mode: "insensitive" }
            }
          }
        }
      ]
    },
    include: {
      supplier: true,
      balances: {
        include: {
          storageLocation: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }],
    take: 30
  });
}

function totalStock(product: BarcodeLookupProduct): number {
  return product.balances.reduce((sum, balance) => sum + balance.quantity, 0);
}

function stockLocationsForProduct(product: BarcodeLookupProduct) {
  return product.balances
    .filter((balance) => balance.quantity > 0)
    .sort((first, second) =>
      first.storageLocation.code.localeCompare(second.storageLocation.code)
    );
}

function productOperationalState(
  product: BarcodeLookupProduct,
  productTotalStock: number
): ProductOperationalState {
  if (product.status !== RecordStatus.ACTIVE) {
    return "inactive";
  }

  return productTotalStock > 0 ? "in_stock" : "zero";
}

function productStateLabel(state: ProductOperationalState): string {
  const labels: Record<ProductOperationalState, string> = {
    in_stock: "Em estoque",
    zero: "Zerado",
    inactive: "Inativo"
  };

  return labels[state];
}

function productStateClassName(state: ProductOperationalState): string {
  const classes: Record<ProductOperationalState, string> = {
    in_stock: "bg-emerald-50 text-emerald-700 border-emerald-200",
    zero: "bg-stone-100 text-stone-700 border-stone-200",
    inactive: "bg-amber-50 text-amber-800 border-amber-200"
  };

  return classes[state];
}

function productCardClassName(state: ProductOperationalState): string {
  const classes: Record<ProductOperationalState, string> = {
    in_stock: "border-stone-200",
    zero: "border-stone-200 opacity-90",
    inactive: "border-amber-200 bg-amber-50/30"
  };

  return classes[state];
}

function productSortRank(product: BarcodeLookupProduct): number {
  const productTotalStock = totalStock(product);

  if (product.status === RecordStatus.ACTIVE && productTotalStock > 0) {
    return 0;
  }

  if (product.status === RecordStatus.ACTIVE) {
    return 1;
  }

  return 2;
}

function sortProductsByOperationalPriority(
  products: BarcodeLookupProduct[]
): BarcodeLookupProduct[] {
  return [...products].sort((first, second) => {
    const rankDifference = productSortRank(first) - productSortRank(second);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    const stockDifference = totalStock(second) - totalStock(first);

    if (stockDifference !== 0) {
      return stockDifference;
    }

    return first.name.localeCompare(second.name);
  });
}

function productSummary(products: BarcodeLookupProduct[]) {
  return products.reduce(
    (summary, product) => {
      const state = productOperationalState(product, totalStock(product));

      if (state === "in_stock") {
        summary.withStock += 1;
      } else if (state === "zero") {
        summary.zero += 1;
      } else {
        summary.inactive += 1;
      }

      return summary;
    },
    { withStock: 0, zero: 0, inactive: 0 }
  );
}

export default async function BarcodeReadingPage({
  searchParams
}: BarcodeReadingPageProps) {
  const user = await requirePagePermission("stock:read");
  const params = await searchParams;
  const code = normalizeBarcode(String(params?.codigo ?? ""));
  const query = String(params?.q ?? "").trim();
  const searchValue = code || query;
  const isBarcodeLookup = Boolean(code);
  const successKey = String(params?.sucesso ?? "");
  const successMessage =
    successKey in successLabels
      ? successLabels[successKey as keyof typeof successLabels]
      : null;
  const canSellStock = hasPermission(user.role, "stock:sale");
  const canWriteStock = hasPermission(user.role, "stock:write");
  const canAuditInventory = hasPermission(user.role, "inventory:audit");
  const canCreateProduct = hasPermission(user.role, "products:write");
  const barcodeLookup = code
    ? await lookupBarcodeProducts({
        barcode: code,
        source: readingSource(params?.fonte),
        userId: user.id,
        shouldRegisterLookup: !successMessage
      })
    : null;
  const rawProducts = barcodeLookup
    ? barcodeLookup.products
    : query
      ? await searchProducts(query)
      : [];
  const products = sortProductsByOperationalPriority(rawProducts);
  const summary = productSummary(products);
  const [activeLocations, activeSuppliers] =
    products.length > 0 && (canWriteStock || canAuditInventory)
      ? await Promise.all([
          prisma.storageLocation.findMany({
            where: { status: RecordStatus.ACTIVE },
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            },
            orderBy: { code: "asc" }
          }),
          prisma.supplier.findMany({
            where: { status: RecordStatus.ACTIVE },
            select: {
              id: true,
              name: true
            },
            orderBy: { name: "asc" }
          })
        ])
      : [[], []];

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Busca e leitura</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Localizar vinho no estoque
        </h2>
      </header>

      <BarcodeReader initialValue={searchValue} />

      {successMessage ? (
        <section className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </section>
      ) : null}

      {!searchValue ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Digite nome, uva, pais, fornecedor ou leia um codigo de barras.
        </section>
      ) : products.length === 0 ? (
        <section className="mt-6 rounded-md border border-stone-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {isBarcodeLookup ? (
                <>
                  <p className="text-sm font-medium text-cellar">
                    Nao cadastrado
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    {code}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Nenhum produto usa este codigo de barras.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-cellar">
                    Sem resultado
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    {query}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Nenhum produto encontrado para esta busca.
                  </p>
                </>
              )}
            </div>
            {isBarcodeLookup && canCreateProduct ? (
              <Link
                href={`/produtos?barcode=${encodeURIComponent(code)}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark"
              >
                <Barcode aria-hidden className="h-4 w-4" />
                Cadastrar produto
              </Link>
            ) : isBarcodeLookup ? (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                Solicite o cadastro para um usuario com permissao de produtos.
              </p>
            ) : null}
          </div>
          {isBarcodeLookup ? (
            <GtinLookupPanel
              barcode={code}
              canCreateProduct={canCreateProduct}
            />
          ) : null}
        </section>
      ) : (
        <section className="mt-6 space-y-3">
          <div className="rounded-md border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-medium text-ink">
                {isBarcodeLookup
                  ? `Resultado para codigo ${code}`
                  : `${products.length} resultado(s) para "${query}"`}
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                  {summary.withStock} com estoque
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-stone-700">
                  {summary.zero} zerado(s)
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                  {summary.inactive} inativo(s)
                </span>
              </div>
            </div>
          </div>

          {isBarcodeLookup && products.length > 1 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Mais de um produto usa este codigo.
              </p>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-md border border-amber-200 bg-white px-3 py-2"
                  >
                    <p className="font-medium text-ink">{product.name}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      {product.vintage ? `Safra ${product.vintage}` : ""}
                      {product.supplier?.name
                        ? ` - ${product.supplier.name}`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-cellar">
                      Saldo {totalStock(product)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {products.map((product) => {
            const stockLocations = stockLocationsForProduct(product);
            const productTotalStock = totalStock(product);
            const operationalState = productOperationalState(
              product,
              productTotalStock
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
                className={`rounded-md border bg-white p-4 ${productCardClassName(
                  operationalState
                )}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid grid-cols-[5rem_1fr] gap-3 sm:grid-cols-[6rem_1fr]">
                    <ProductPhoto
                      src={product.photoUrl}
                      alt={product.name}
                      className="h-28 w-20 sm:h-32 sm:w-24"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold leading-snug text-ink sm:text-xl">
                          {product.name}
                        </h3>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${productStateClassName(
                            operationalState
                          )}`}
                        >
                          {productStateLabel(operationalState)}
                        </span>
                      </div>
                      <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-stone-600">
                        <Wine
                          aria-hidden
                          className="mt-0.5 h-4 w-4 shrink-0 text-cellar"
                        />
                        <span className="min-w-0">{characteristics}</span>
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        {product.barcode
                          ? `Codigo ${product.barcode}`
                          : "Codigo nao informado"}
                      </p>
                      {product.salePrice ? (
                        <p className="mt-1 text-sm font-semibold text-cellar">
                          Venda {formatCurrency(product.salePrice)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-md border border-cellar/20 bg-blush px-5 py-4 text-left lg:text-right">
                    <p className="text-xs font-medium uppercase tracking-normal text-stone-500">
                      Saldo total
                    </p>
                    <p className="mt-1 text-4xl font-semibold text-cellarDark">
                      {productTotalStock}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Boxes aria-hidden className="h-4 w-4 text-cellar" />
                      Onde encontrar
                    </p>
                    {stockLocations.length === 0 ? (
                      <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
                        Nenhuma unidade em local de estoque.
                      </p>
                    ) : (
                      <div
                        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                      >
                        {stockLocations.map((balance) => (
                          <div
                            key={balance.id}
                            className="rounded-md border border-cellar/20 bg-blush px-4 py-3"
                          >
                            <p className="text-lg font-semibold text-ink">
                              {balance.storageLocation.code}
                            </p>
                            <p className="text-sm text-stone-500">
                              {balance.storageLocation.name}
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-cellar">
                              {balance.quantity} unidades
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isActive ? (
                    <QuickActionForms
                      product={product}
                      returnBarcode={isBarcodeLookup ? code : undefined}
                      returnQuery={!isBarcodeLookup ? query : undefined}
                      counterMode
                      balancesWithStock={stockLocations}
                      activeLocations={activeLocations}
                      activeSuppliers={activeSuppliers}
                      canSellStock={canSellStock}
                      canWriteStock={canWriteStock}
                      canAuditInventory={canAuditInventory}
                    />
                  ) : (
                    <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
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
