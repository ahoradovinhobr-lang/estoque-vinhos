import {
  BarcodeLookupSource,
  ProductType,
  RecordStatus,
  WineColor
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { lookupBarcodeProducts } from "@/services/barcode.service";

const productTypeLabels: Record<ProductType, string> = {
  WINE: "Vinho",
  SPARKLING: "Espumante"
};

const wineColorLabels: Record<WineColor, string> = {
  RED: "Tinto",
  WHITE: "Branco",
  ROSE: "Rose"
};

type ProductBarcodeRouteProps = {
  params: Promise<{
    barcode: string;
  }>;
};

function clientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: ProductBarcodeRouteProps
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sessao expirada. Faca login novamente." },
      { status: 401 }
    );
  }

  if (!hasPermission(user.role, "stock:read")) {
    return NextResponse.json(
      { error: "Permissao insuficiente." },
      { status: 403 }
    );
  }

  const { barcode } = await params;
  const lookup = await lookupBarcodeProducts({
    barcode,
    source: BarcodeLookupSource.API,
    userId: user.id,
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent")
  });

  if (!lookup.status) {
    return NextResponse.json(
      { error: "Codigo de barras nao informado." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    barcode: lookup.barcode,
    status: lookup.status,
    count: lookup.products.length,
    products: lookup.products.map((product) => ({
      id: product.id,
      name: product.name,
      type: product.type,
      typeLabel: productTypeLabels[product.type],
      wineColor: product.wineColor,
      wineColorLabel: wineColorLabels[product.wineColor],
      grape: product.grape,
      country: product.country,
      vintage: product.vintage,
      barcode: product.barcode,
      salePrice: product.salePrice?.toString() ?? null,
      photoUrl: product.photoUrl,
      supplier: product.supplier
        ? {
            id: product.supplier.id,
            name: product.supplier.name
          }
        : null,
      status: product.status,
      statusLabel:
        product.status === RecordStatus.ACTIVE ? "Ativo" : "Inativo",
      totalStock: product.balances.reduce(
        (sum, balance) => sum + balance.quantity,
        0
      ),
      balances: product.balances
        .filter((balance) => balance.quantity > 0)
        .map((balance) => ({
          locationId: balance.storageLocationId,
          locationCode: balance.storageLocation.code,
          locationName: balance.storageLocation.name,
          quantity: balance.quantity
        }))
    }))
  });
}
