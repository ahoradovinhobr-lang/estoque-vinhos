import { randomUUID } from "crypto";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { productOptionLabel } from "../options";
import { SaleExitForm } from "./sale-exit-form";

export const dynamic = "force-dynamic";

type SaleExitPageProps = {
  searchParams?: Promise<{
    productId?: string;
  }>;
};

export default async function SaleExitPage({
  searchParams
}: SaleExitPageProps) {
  await requirePagePermission("stock:sale");

  const params = await searchParams;
  const selectedProductId = String(params?.productId ?? "");
  const [products, locations, balances] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        balances: {
          some: {
            quantity: { gt: 0 },
            storageLocation: { status: "ACTIVE" }
          }
        }
      },
      include: {
        supplier: true,
        balances: {
          where: {
            quantity: { gt: 0 },
            storageLocation: { status: "ACTIVE" }
          },
          select: {
            quantity: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.storageLocation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" }
    }),
    prisma.inventoryBalance.findMany({
      where: {
        quantity: { gt: 0 },
        product: { status: "ACTIVE" },
        storageLocation: { status: "ACTIVE" }
      },
      select: {
        productId: true,
        storageLocationId: true,
        quantity: true
      }
    })
  ]);

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Movimentacao</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Saida por venda
        </h2>
      </header>

      <SaleExitForm
        idempotencyKey={`sale:${randomUUID()}`}
        initialProductId={selectedProductId}
        products={products.map((product) => {
          const label = productOptionLabel(product);
          const totalStock = product.balances.reduce(
            (sum, balance) => sum + balance.quantity,
            0
          );

          return {
            id: product.id,
            label,
            barcode: product.barcode,
            totalStock,
            searchText: [
              label,
              product.barcode,
              product.sku,
              product.country,
              product.supplier?.name
            ]
              .filter((item): item is string => Boolean(item))
              .join(" ")
          };
        })}
        locations={locations.map((location) => ({
          id: location.id,
          code: location.code,
          name: location.name,
          type: location.type
        }))}
        balances={Object.fromEntries(
          balances.map((balance) => [
            `${balance.productId}:${balance.storageLocationId}`,
            balance.quantity
          ])
        )}
      />
    </AppShell>
  );
}
