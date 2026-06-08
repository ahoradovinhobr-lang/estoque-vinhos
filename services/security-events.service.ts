import { headers } from "next/headers";
import { SecurityEventType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SecurityEventInput = {
  eventType: SecurityEventType;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  email?: string | null;
  metadata?: Prisma.InputJsonValue;
};

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.split(",")[0]?.trim() || null;
}

export async function requestContext() {
  const headerStore = await headers();

  return {
    ipAddress:
      firstHeaderValue(headerStore.get("x-forwarded-for")) ||
      firstHeaderValue(headerStore.get("x-real-ip")),
    userAgent: headerStore.get("user-agent") || null
  };
}

export async function recordSecurityEvent(input: SecurityEventInput) {
  const context = await requestContext();

  try {
    await prisma.securityEvent.create({
      data: {
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        email: input.email?.trim().toLowerCase() || null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: input.metadata
      }
    });
  } catch {
    // Security logging must not break the operational flow.
  }
}
