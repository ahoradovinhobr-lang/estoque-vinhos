import { ProductType, RecordStatus, WineColor } from "@prisma/client";
import { Barcode, ImageIcon, Plus, RotateCcw, Wine, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";

import {
  createProduct,
  inactivateProduct,
  reactivateProduct
} from "./actions";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams?: Promise<{
    barcode?: string;
    country?: string;
    grape?: string;
    name?: string;
    photoUrl?: string;
    type?: string;
    vintage?: string;
    wineColor?: string;
  }>;
};

function enumParam<T extends string>(
  value: string | undefined,
  allowedValues: T[]
): T | "" {
  const candidate = String(value ?? "").trim();

  return allowedValues.includes(candidate as T) ? (candidate as T) : "";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  await requirePagePermission("products:write");

  const params = await searchParams;
  const initialBarcode = String(params?.barcode ?? "").trim();
  const initialName = String(params?.name ?? "").trim();
  const initialCountry = String(params?.country ?? "").trim();
  const initialPhotoUrl = String(params?.photoUrl ?? "").trim();
  const initialGrape = String(params?.grape ?? "").trim();
  const initialVintage = String(params?.vintage ?? "").trim();
  const initialType = enumParam(params?.type, Object.values(ProductType));
  const initialWineColor = enumParam(
    params?.wineColor,
    Object.values(WineColor)
  );

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      include: {
        balances: true,
        supplier: true
      },
      orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }]
    }),
    prisma.supplier.findMany({
      where: { status: RecordStatus.ACTIVE },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Cadastro</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Produtos</h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-ink">Novo produto</h3>
        <form action={createProduct} className="grid gap-3 lg:grid-cols-12">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              SKU
            </span>
            <input
              name="sku"
              required
              placeholder="VIN-001"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm uppercase outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-4">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Nome
            </span>
            <input
              name="name"
              required
              defaultValue={initialName}
              placeholder="Nome do rotulo"
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
              defaultValue={initialType}
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(productTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Cor
            </span>
            <select
              name="wineColor"
              required
              defaultValue={initialWineColor}
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(wineColorLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Pais
            </span>
            <input
              name="country"
              defaultValue={initialCountry}
              placeholder="Brasil"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Safra
            </span>
            <input
              name="vintage"
              defaultValue={initialVintage}
              placeholder="2020"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-3">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Fornecedor
            </span>
            <select
              name="supplierId"
              defaultValue=""
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-3">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Uva
            </span>
            <input
              name="grape"
              required
              defaultValue={initialGrape}
              placeholder="Cabernet Sauvignon"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Codigo de barras
            </span>
            <input
              name="barcode"
              inputMode="numeric"
              defaultValue={initialBarcode}
              placeholder="789..."
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Custo
            </span>
            <input
              name="costPrice"
              inputMode="decimal"
              placeholder="0,00"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Venda
            </span>
            <input
              name="salePrice"
              inputMode="decimal"
              placeholder="0,00"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-5">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Foto
            </span>
            <input
              name="photoUrl"
              type="url"
              defaultValue={initialPhotoUrl}
              placeholder="https://..."
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
          <div className="flex items-end lg:col-span-2">
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
            Produtos cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Identificacao</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Valores</th>
                <th className="px-4 py-3 text-right font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={7}
                  >
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const totalStock = product.balances.reduce(
                    (sum, balance) => sum + balance.quantity,
                    0
                  );
                  const characteristics = [
                    productTypeLabels[product.type],
                    wineColorLabels[product.wineColor],
                    `Uva ${product.grape}`,
                    product.country,
                    product.vintage ? `Safra ${product.vintage}` : null
                  ]
                    .filter((item): item is string => Boolean(item))
                    .join(" - ");

                  return (
                    <tr key={product.id} className="border-b border-stone-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.photoUrl ? (
                            <img
                              src={product.photoUrl}
                              alt=""
                              className="h-12 w-12 rounded-md border border-stone-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-400">
                              <ImageIcon aria-hidden className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-ink">
                              {product.name}
                            </p>
                            <p className="inline-flex items-center gap-2 text-stone-500">
                              <Wine
                                aria-hidden
                                className="h-4 w-4 text-cellar"
                              />
                              {characteristics}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        <p className="font-medium text-ink">{product.sku}</p>
                        <p className="inline-flex items-center gap-2">
                          <Barcode
                            aria-hidden
                            className="h-4 w-4 text-stone-400"
                          />
                          {product.barcode || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {product.supplier?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        <p>Custo {formatCurrency(product.costPrice)}</p>
                        <p>Venda {formatCurrency(product.salePrice)}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {totalStock}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                          {product.status === RecordStatus.ACTIVE
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form
                          action={
                            product.status === RecordStatus.ACTIVE
                              ? inactivateProduct
                              : reactivateProduct
                          }
                        >
                          <input type="hidden" name="id" value={product.id} />
                          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                            {product.status === RecordStatus.ACTIVE ? (
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
