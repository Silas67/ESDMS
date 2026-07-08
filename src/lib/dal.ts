import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
});

export type Scope = {
  role: Role;
  zoneId: string | null;
  stateId: string | null;
  lgaId: string | null;
  serviceNo: string | null;
};

const NO_MATCH = { id: "__none__" };

const stateIdsForZone = cache(async (zoneId: string) => {
  const states = await prisma.state.findMany({
    where: { zoneId },
    select: { id: true },
  });
  return states.map((s) => s.id);
});

/**
 * `where` fragment for models that store a flat `stateId` column
 * (User, Officer). Every non-national role is scoped by an ID taken
 * from the signed-in user's session, never from request input.
 */
export async function personnelScopeWhere(scope: Scope) {
  switch (scope.role) {
    case "IGP":
      return {};
    case "AIG":
      if (!scope.zoneId) return NO_MATCH;
      return { stateId: { in: await stateIdsForZone(scope.zoneId) } };
    case "CP":
      return scope.stateId ? { stateId: scope.stateId } : NO_MATCH;
    case "DPO":
      return scope.lgaId ? { lgaId: scope.lgaId } : NO_MATCH;
    case "SPO":
      return scope.serviceNo ? { serviceNo: scope.serviceNo } : NO_MATCH;
    default:
      return NO_MATCH;
  }
}

/**
 * `where` fragment for PollingUnit, which only stores `lgaId` and reaches
 * State/Zone through the LGA relation.
 */
export async function pollingUnitScopeWhere(scope: Scope) {
  switch (scope.role) {
    case "IGP":
      return {};
    case "AIG":
      if (!scope.zoneId) return NO_MATCH;
      return { lga: { stateId: { in: await stateIdsForZone(scope.zoneId) } } };
    case "CP":
      return scope.stateId ? { lga: { stateId: scope.stateId } } : NO_MATCH;
    case "DPO":
      return scope.lgaId ? { lgaId: scope.lgaId } : NO_MATCH;
    case "SPO":
    default:
      return NO_MATCH;
  }
}

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    redirect("/dashboard");
  }
}
