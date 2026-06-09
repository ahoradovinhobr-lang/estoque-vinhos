import {
  BarcodeLookupSource,
  BarcodeLookupStatus,
  SecurityEventType
} from "@prisma/client";
import { Barcode, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const eventLabels: Record<SecurityEventType, string> = {
  LOGIN_SUCCESS: "Login realizado",
  LOGIN_FAILURE: "Falha de login",
  LOGIN_LOCKOUT: "Bloqueio temporario",
  MFA_SUCCESS: "MFA validado",
  MFA_FAILURE: "Falha de MFA",
  MFA_ENABLED: "MFA ativado",
  MFA_RESET: "MFA resetado",
  RECOVERY_CODE_USED: "Codigo de recuperacao usado",
  LOGOUT: "Logout",
  PASSWORD_CHANGE: "Senha alterada",
  PASSWORD_RESET: "Senha resetada",
  USER_CREATED: "Usuario criado",
  USER_INACTIVATED: "Usuario inativado",
  USER_REACTIVATED: "Usuario reativado"
};

const barcodeStatusLabels: Record<BarcodeLookupStatus, string> = {
  FOUND: "Encontrado",
  NOT_FOUND: "Nao cadastrado",
  AMBIGUOUS: "Ambiguo"
};

const barcodeSourceLabels: Record<BarcodeLookupSource, string> = {
  INPUT: "Input/leitor",
  CAMERA: "Camera",
  DIRECT_URL: "URL direta",
  API: "API"
};

export const dynamic = "force-dynamic";

export default async function SecurityEventsPage() {
  await requirePagePermission("security:read");

  const [events, barcodeLookups] = await Promise.all([
    prisma.securityEvent.findMany({
      include: {
        actorUser: true,
        subjectUser: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.barcodeLookup.findMany({
      include: {
        matchedProduct: true,
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">Auditoria</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Seguranca</h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <ShieldCheck aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Eventos recentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Ator</th>
                <th className="px-4 py-3 font-medium">Alvo</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={6}
                  >
                    Nenhum evento de seguranca registrado.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-stone-100">
                    <td className="px-4 py-3 font-medium text-ink">
                      {eventLabels[event.eventType]}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.actorUser?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.subjectUser?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.ipAddress || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.createdAt.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <Barcode aria-hidden className="h-4 w-4 text-cellar" />
          <h3 className="text-base font-semibold text-ink">
            Leituras de codigo de barras
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Codigo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 text-right font-medium">
                  Resultados
                </th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {barcodeLookups.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-stone-500"
                    colSpan={7}
                  >
                    Nenhuma leitura registrada.
                  </td>
                </tr>
              ) : (
                barcodeLookups.map((lookup) => (
                  <tr key={lookup.id} className="border-b border-stone-100">
                    <td className="px-4 py-3 font-medium text-ink">
                      {lookup.barcode}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {barcodeStatusLabels[lookup.status]}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {barcodeSourceLabels[lookup.source]}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {lookup.matchedProduct
                        ? `${lookup.matchedProduct.name} (${lookup.matchedProduct.sku})`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {lookup.matchedProductCount}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {lookup.user?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {lookup.createdAt.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
