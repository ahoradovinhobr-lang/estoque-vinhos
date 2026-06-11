import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { lookupGtin } from "@/services/gtin.service";

type GtinRouteProps = {
  params: Promise<{
    gtin: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: GtinRouteProps) {
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

  const { gtin } = await params;

  return NextResponse.json(await lookupGtin(gtin));
}
