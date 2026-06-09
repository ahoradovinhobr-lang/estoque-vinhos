import { randomUUID } from "crypto";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  ClipboardCheck
} from "lucide-react";
import type { StorageLocation, Supplier } from "@prisma/client";

import type { BarcodeLookupProduct } from "@/services/barcode.service";

import {
  quickRegisterEntry,
  quickRegisterExit,
  quickRegisterInventoryAudit,
  quickRegisterTransfer
} from "./actions";

const inputClass =
  "h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15";
const selectClass =
  "h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15";
const primaryButtonClass =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733]";

type QuickActionFormsProps = {
  product: BarcodeLookupProduct;
  returnBarcode?: string;
  returnQuery?: string;
  balancesWithStock: BarcodeLookupProduct["balances"];
  activeLocations: Pick<StorageLocation, "id" | "code" | "name">[];
  activeSuppliers: Pick<Supplier, "id" | "name">[];
  canWriteStock: boolean;
  canAuditInventory: boolean;
};

function ReturnFields({
  returnBarcode,
  returnQuery
}: Pick<QuickActionFormsProps, "returnBarcode" | "returnQuery">) {
  return (
    <>
      {returnBarcode ? (
        <input type="hidden" name="returnBarcode" value={returnBarcode} />
      ) : null}
      {returnQuery ? (
        <input type="hidden" name="returnQuery" value={returnQuery} />
      ) : null}
    </>
  );
}

export function QuickActionForms({
  product,
  returnBarcode,
  returnQuery,
  balancesWithStock,
  activeLocations,
  activeSuppliers,
  canWriteStock,
  canAuditInventory
}: QuickActionFormsProps) {
  const firstStockLocationId = balancesWithStock[0]?.storageLocationId ?? "";
  const firstActiveLocationId = activeLocations[0]?.id ?? "";

  if (!canWriteStock && !canAuditInventory) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <p className="mb-3 text-sm font-semibold text-ink">Acoes rapidas</p>

      <div className="space-y-2">
        {canWriteStock ? (
          <>
            <details className="border-t border-stone-100 pt-3" open>
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Entrada
              </summary>
              <form
                action={quickRegisterEntry}
                className="mt-3 grid gap-3 lg:grid-cols-8"
              >
                <input type="hidden" name="productId" value={product.id} />
                <ReturnFields
                  returnBarcode={returnBarcode}
                  returnQuery={returnQuery}
                />
                <input
                  type="hidden"
                  name="idempotencyKey"
                  value={`quick-entry:${randomUUID()}`}
                />
                <label>
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Qtd.
                  </span>
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={1}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="lg:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Destino
                  </span>
                  <select
                    name="destinationLocationId"
                    required
                    defaultValue={firstActiveLocationId}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {activeLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lg:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Fornecedor
                  </span>
                  <select
                    name="supplierId"
                    defaultValue=""
                    className={selectClass}
                  >
                    <option value="">Sem fornecedor</option>
                    {activeSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lg:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-stone-600">
                    Observacoes
                  </span>
                  <input name="notes" className={inputClass} />
                </label>
                <div className="flex items-end">
                  <button className={primaryButtonClass}>
                    <ArrowDownToLine aria-hidden className="h-4 w-4" />
                    Entrada
                  </button>
                </div>
              </form>
            </details>

            <details className="border-t border-stone-100 pt-3">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Saida
              </summary>
              {balancesWithStock.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Sem saldo disponivel para saida.
                </p>
              ) : (
                <form
                  action={quickRegisterExit}
                  className="mt-3 grid gap-3 lg:grid-cols-8"
                >
                  <input type="hidden" name="productId" value={product.id} />
                  <ReturnFields
                    returnBarcode={returnBarcode}
                    returnQuery={returnQuery}
                  />
                  <input
                    type="hidden"
                    name="idempotencyKey"
                    value={`quick-exit:${randomUUID()}`}
                  />
                  <label>
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Qtd.
                    </span>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={1}
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Origem
                    </span>
                    <select
                      name="sourceLocationId"
                      required
                      defaultValue={firstStockLocationId}
                      className={selectClass}
                    >
                      {balancesWithStock.map((balance) => (
                        <option
                          key={balance.storageLocationId}
                          value={balance.storageLocationId}
                        >
                          {balance.storageLocation.code} - {balance.quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Motivo
                    </span>
                    <input
                      name="reason"
                      defaultValue="Venda"
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Observacoes
                    </span>
                    <input name="notes" className={inputClass} />
                  </label>
                  <div className="flex items-end">
                    <button className={primaryButtonClass}>
                      <ArrowUpFromLine aria-hidden className="h-4 w-4" />
                      Saida
                    </button>
                  </div>
                </form>
              )}
            </details>

            <details className="border-t border-stone-100 pt-3">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Transferencia
              </summary>
              {balancesWithStock.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Sem saldo disponivel para transferencia.
                </p>
              ) : (
                <form
                  action={quickRegisterTransfer}
                  className="mt-3 grid gap-3 lg:grid-cols-8"
                >
                  <input type="hidden" name="productId" value={product.id} />
                  <ReturnFields
                    returnBarcode={returnBarcode}
                    returnQuery={returnQuery}
                  />
                  <input
                    type="hidden"
                    name="idempotencyKey"
                    value={`quick-transfer:${randomUUID()}`}
                  />
                  <label>
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Qtd.
                    </span>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={1}
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Origem
                    </span>
                    <select
                      name="sourceLocationId"
                      required
                      defaultValue={firstStockLocationId}
                      className={selectClass}
                    >
                      {balancesWithStock.map((balance) => (
                        <option
                          key={balance.storageLocationId}
                          value={balance.storageLocationId}
                        >
                          {balance.storageLocation.code} - {balance.quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Destino
                    </span>
                    <select
                      name="destinationLocationId"
                      required
                      defaultValue=""
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {activeLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} - {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Observacoes
                    </span>
                    <input name="notes" className={inputClass} />
                  </label>
                  <div className="flex items-end">
                    <button className={primaryButtonClass}>
                      <ArrowRightLeft aria-hidden className="h-4 w-4" />
                      Transferir
                    </button>
                  </div>
                </form>
              )}
            </details>
          </>
        ) : null}

        {canAuditInventory ? (
          <details className="border-t border-stone-100 pt-3">
            <summary className="cursor-pointer text-sm font-medium text-stone-700">
              Inventario
            </summary>
            <form
              action={quickRegisterInventoryAudit}
              className="mt-3 grid gap-3 lg:grid-cols-8"
            >
              <input type="hidden" name="productId" value={product.id} />
              <ReturnFields
                returnBarcode={returnBarcode}
                returnQuery={returnQuery}
              />
              <input
                type="hidden"
                name="idempotencyKey"
                value={`quick-inventory:${randomUUID()}`}
              />
              <label className="lg:col-span-2">
                <span className="mb-1 block text-xs font-medium text-stone-600">
                  Local
                </span>
                <select
                  name="storageLocationId"
                  required
                  defaultValue={firstStockLocationId || firstActiveLocationId}
                  className={selectClass}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {activeLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.code} - {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-stone-600">
                  Contada
                </span>
                <input
                  name="countedQuantity"
                  type="number"
                  min={0}
                  step={1}
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex h-10 items-center gap-2 self-end rounded-md border border-stone-300 px-3 text-sm text-stone-700 lg:col-span-2">
                <input
                  name="applyAdjustment"
                  type="checkbox"
                  className="h-4 w-4 accent-cellar"
                />
                Aplicar ajuste
              </label>
              <label className="lg:col-span-2">
                <span className="mb-1 block text-xs font-medium text-stone-600">
                  Justificativa
                </span>
                <input
                  name="reason"
                  placeholder="se ajustar"
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <button className={primaryButtonClass}>
                  <ClipboardCheck aria-hidden className="h-4 w-4" />
                  Inventario
                </button>
              </div>
            </form>
          </details>
        ) : null}
      </div>
    </div>
  );
}
