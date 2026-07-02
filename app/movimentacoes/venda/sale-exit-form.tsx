"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

import { StorageLocationPicker } from "@/components/location/storage-location-picker";

import { registerSaleExit } from "../actions";

type ProductOption = {
  id: string;
  label: string;
  barcode: string | null;
  searchText: string;
  totalStock: number;
};

type LocationOption = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type SaleItem = {
  productId: string;
  sourceLocationId: string;
  quantity: number;
};

type SaleExitFormProps = {
  idempotencyKey: string;
  initialProductId?: string;
  products: ProductOption[];
  locations: LocationOption[];
  balances: Record<string, number>;
};

const channels = ["Balcao", "iFood", "WhatsApp", "Outro"];

function locationLabel(location: LocationOption | undefined): string {
  if (!location) {
    return "-";
  }

  return `${location.code} - ${location.name}`;
}

export function SaleExitForm({
  idempotencyKey,
  initialProductId = "",
  products,
  locations,
  balances
}: SaleExitFormProps) {
  const [channel, setChannel] = useState(channels[0]);
  const [productId, setProductId] = useState(initialProductId);
  const [productSearch, setProductSearch] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<SaleItem[]>([]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const locationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  );
  const selectedProduct = productById.get(productId);
  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLocaleLowerCase("pt-BR");

    if (normalized.length < 2) {
      return [];
    }

    return products
      .filter((product) =>
        product.searchText.toLocaleLowerCase("pt-BR").includes(normalized)
      )
      .slice(0, 8);
  }, [productSearch, products]);
  const availableLocations = useMemo(() => {
    if (!productId) {
      return [];
    }

    return locations
      .map((location) => ({
        ...location,
        quantity: balances[`${productId}:${location.id}`] ?? 0
      }))
      .filter((location) => location.quantity > 0);
  }, [balances, locations, productId]);
  const selectedBalance = balances[`${productId}:${sourceLocationId}`] ?? 0;

  useEffect(() => {
    const initialProduct = productById.get(initialProductId);

    if (initialProduct) {
      setProductSearch(initialProduct.label);
    }
  }, [initialProductId, productById]);

  useEffect(() => {
    const normalized = productSearch.trim();

    if (productId || !/^\d{6,}$/.test(normalized)) {
      return;
    }

    const exactBarcodeMatch = products.find(
      (product) => product.barcode === normalized
    );

    if (exactBarcodeMatch) {
      setProductId(exactBarcodeMatch.id);
      setProductSearch(exactBarcodeMatch.label);
    }
  }, [productId, productSearch, products]);

  useEffect(() => {
    if (
      sourceLocationId &&
      !availableLocations.some((location) => location.id === sourceLocationId)
    ) {
      setSourceLocationId("");
    }
  }, [availableLocations, sourceLocationId]);

  function addItem() {
    if (!productId || !sourceLocationId || quantity <= 0) {
      return;
    }

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.productId === productId &&
          item.sourceLocationId === sourceLocationId
      );

      if (existingIndex === -1) {
        return [...currentItems, { productId, sourceLocationId, quantity }];
      }

      return currentItems.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    });

    setQuantity(1);
  }

  function selectProduct(product: ProductOption) {
    setProductId(product.id);
    setProductSearch(product.label);
    setSourceLocationId("");
  }

  function clearSelectedProduct() {
    setProductId("");
    setProductSearch("");
    setSourceLocationId("");
  }

  function removeItem(indexToRemove: number) {
    setItems((currentItems) =>
      currentItems.filter((_, index) => index !== indexToRemove)
    );
  }

  return (
    <form action={registerSaleExit} className="grid min-w-0 gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <section className="min-w-0 rounded-md border border-stone-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-6">
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Canal
            </span>
            <select
              name="channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            >
              {channels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Referencia do pedido
            </span>
            <input
              name="externalReference"
              placeholder="pedido iFood, comanda, venda"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <label className="lg:col-span-3">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observacoes
            </span>
            <input
              name="notes"
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
        </div>
      </section>

      <section className="min-w-0 rounded-md border border-stone-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-9">
          <div className="relative lg:col-span-4">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Buscar produto
            </span>
            <input
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductId("");
                setSourceLocationId("");
              }}
              autoComplete="off"
              placeholder="Digite nome, uva ou bipe o codigo"
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
            {selectedProduct ? (
              <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {selectedProduct.label}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Saldo total {selectedProduct.totalStock}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedProduct}
                    className="shrink-0 text-xs font-semibold text-cellar hover:text-cellarDark"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            ) : productSearch.trim().length >= 2 ? (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className="block w-full border-b border-stone-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blush"
                    >
                      <span className="block font-medium text-ink">
                        {product.label}
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        {product.barcode ? `Codigo ${product.barcode} - ` : ""}
                        Saldo {product.totalStock}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-stone-500">
                    Nenhum produto com saldo encontrado.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                Digite pelo menos 2 caracteres ou bipe o codigo de barras.
              </p>
            )}
          </div>
          <StorageLocationPicker
            name="sourceLocationId"
            label="Local"
            locations={availableLocations}
            value={sourceLocationId}
            onValueChange={setSourceLocationId}
            required={false}
            showQuantity={Boolean(productId)}
            className="lg:col-span-3"
          />
          <label>
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Quantidade
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cellar px-3 text-sm font-semibold text-cellar hover:bg-blush"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Saldo no local selecionado:{" "}
          <span className="font-semibold text-ink">{selectedBalance}</span>
        </p>
      </section>

      <section className="min-w-0 rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold text-ink">Itens da venda</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 text-right font-medium">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-right font-medium">Remover</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    Nenhum item adicionado.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.productId}:${item.sourceLocationId}`}>
                    <td className="border-b border-stone-100 px-4 py-3 font-medium text-ink">
                      {productById.get(item.productId)?.label ?? "-"}
                    </td>
                    <td className="border-b border-stone-100 px-4 py-3 text-stone-600">
                      {locationLabel(locationById.get(item.sourceLocationId))}
                    </td>
                    <td className="border-b border-stone-100 px-4 py-3 text-right font-semibold text-ink">
                      {item.quantity}
                    </td>
                    <td className="border-b border-stone-100 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50"
                        aria-label="Remover item"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/movimentacoes"
          className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Voltar
        </Link>
        <button
          disabled={items.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-cellarDark disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          <ShoppingCart aria-hidden className="h-4 w-4" />
          Registrar venda
        </button>
      </div>
    </form>
  );
}
