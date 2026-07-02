import Link from "next/link";
import { ProductType, RecordStatus, WineColor } from "@prisma/client";
import {
  Barcode,
  ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Wine,
  XCircle
} from "lucide-react";

import { ConfirmSubmitButton } from "@/components/form/confirm-submit-button";
import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";

import {
  createProduct,
  deleteProduct,
  inactivateProduct,
  reactivateProduct,
  updateProduct
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
    edit?: string;
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

type SupplierOption = {
  id: string;
  name: string;
};

type ProductFormInitial = {
  barcode?: string | null;
  country?: string | null;
  grape?: string | null;
  name?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  salePrice?: { toString(): string } | string | null;
  supplierId?: string | null;
  type?: ProductType | "";
  vintage?: string | null;
  wineColor?: WineColor | "";
};

function ProductFormFields({
  initial = {},
  suppliers
}: {
  initial?: ProductFormInitial;
  suppliers: SupplierOption[];
}) {
  return (
    <>
      <label className="lg:col-span-6">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Nome
        </span>
        <input
          name="name"
          required
          defaultValue={initial.name ?? ""}
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
          defaultValue={initial.type ?? ""}
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
          defaultValue={initial.wineColor ?? ""}
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
          defaultValue={initial.country ?? ""}
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
          defaultValue={initial.vintage ?? ""}
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
          defaultValue={initial.supplierId ?? ""}
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
          defaultValue={initial.grape ?? ""}
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
          defaultValue={initial.barcode ?? ""}
          placeholder="789..."
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
          defaultValue={initial.salePrice?.toString() ?? ""}
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
          defaultValue={initial.photoUrl ?? ""}
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
          defaultValue={initial.notes ?? ""}
          className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
        />
      </label>
    </>
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const currentUser = await requirePagePermission("products:write");
  const canManageProducts = hasPermission(currentUser.role, "products:delete");

  const params = await searchParams;
  const productIdToEdit = String(params?.edit ?? "").trim();
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
        supplier: true,
        _count: {
          select: {
            inventoryAudits: true,
            movementLines: true,
            movements: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { name: "asc" }, { vintage: "desc" }]
    }),
    prisma.supplier.findMany({
      where: { status: RecordStatus.ACTIVE },
      orderBy: { name: "asc" }
    })
  ]);
  const productToEdit = productIdToEdit
    ? products.find((product) => product.id === productIdToEdit)
    : null;

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Cadastro</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Produtos</h2>
      </header>

      <section className="min-w-0 rounded-md border border-stone-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-ink">Novo produto</h3>
        <form action={createProduct} className="grid gap-3 lg:grid-cols-12">
          <ProductFormFields
            suppliers={suppliers}
            initial={{
              barcode: initialBarcode,
              country: initialCountry,
              grape: initialGrape,
              name: initialName,
              photoUrl: initialPhotoUrl,
              type: initialType,
              vintage: initialVintage,
              wineColor: initialWineColor
            }}
          />
          <div className="flex items-end lg:col-span-2">
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </form>
      </section>

      {productToEdit ? (
        <section
          id="editar-produto"
          className="mt-6 min-w-0 rounded-md border border-cellar/25 bg-white p-4 shadow-sm"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cellar">Edicao</p>
              <h3 className="text-base font-semibold text-ink">
                Editar produto
              </h3>
            </div>
            <Link
              href="/produtos"
              className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </Link>
          </div>
          <form action={updateProduct} className="grid gap-3 lg:grid-cols-12">
            <input type="hidden" name="id" value={productToEdit.id} />
            <ProductFormFields
              suppliers={suppliers}
              initial={{
                barcode: productToEdit.barcode,
                country: productToEdit.country,
                grape: productToEdit.grape,
                name: productToEdit.name,
                notes: productToEdit.notes,
                photoUrl: productToEdit.photoUrl,
                salePrice: productToEdit.salePrice,
                supplierId: productToEdit.supplierId,
                type: productToEdit.type,
                vintage: productToEdit.vintage,
                wineColor: productToEdit.wineColor
              }}
            />
            <div className="flex items-end lg:col-span-2">
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark">
                <Save aria-hidden className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </form>
        </section>
      ) : productIdToEdit ? (
        <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Produto selecionado para edicao nao foi encontrado.
        </section>
      ) : null}

      <section className="mt-6 min-w-0 rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">
            Produtos cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Codigo de barras</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Venda</th>
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
                  const hasOperationalHistory =
                    product.balances.length > 0 ||
                    product._count.inventoryAudits > 0 ||
                    product._count.movementLines > 0 ||
                    product._count.movements > 0;
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
                        {formatCurrency(product.salePrice)}
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
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/produtos?edit=${product.id}#editar-produto`}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                            Editar
                          </Link>
                          {canManageProducts ? (
                            <>
                            <form
                              action={
                                product.status === RecordStatus.ACTIVE
                                  ? inactivateProduct
                                  : reactivateProduct
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={product.id}
                              />
                              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
                                {product.status === RecordStatus.ACTIVE ? (
                                  <>
                                    <XCircle
                                      aria-hidden
                                      className="h-4 w-4"
                                    />
                                    Inativar
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw
                                      aria-hidden
                                      className="h-4 w-4"
                                    />
                                    Reativar
                                  </>
                                )}
                              </button>
                            </form>
                            {!hasOperationalHistory ? (
                              <form action={deleteProduct}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={product.id}
                                />
                                <ConfirmSubmitButton
                                  message={`Excluir definitivamente "${product.name}"? Esta acao nao pode ser desfeita.`}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                                >
                                  <Trash2
                                    aria-hidden
                                    className="h-4 w-4"
                                  />
                                  Excluir
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}
                            </>
                          ) : null}
                        </div>
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
