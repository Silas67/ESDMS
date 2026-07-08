import "server-only";
import { prisma } from "@/lib/prisma";
import { personnelScopeWhere, type Scope } from "@/lib/dal";

export const PAGE_SIZE = 20;

export async function getOfficersPage({
  scope,
  page,
  q,
}: {
  scope: Scope;
  page: number;
  q?: string;
}) {
  const where = {
    ...(await personnelScopeWhere(scope)),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { serviceNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.officer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.officer.count({ where }),
  ]);

  const stateIds = [...new Set(rows.map((r) => r.stateId))];
  const lgaIds = [...new Set(rows.map((r) => r.lgaId).filter((id): id is string => !!id))];

  const [states, lgas] = await Promise.all([
    stateIds.length
      ? prisma.state.findMany({ where: { id: { in: stateIds } }, select: { id: true, name: true } })
      : [],
    lgaIds.length
      ? prisma.lGA.findMany({ where: { id: { in: lgaIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const stateNameById = new Map(states.map((s) => [s.id, s.name]));
  const lgaNameById = new Map(lgas.map((l) => [l.id, l.name]));

  return {
    rows: rows.map((r) => ({
      ...r,
      stateName: stateNameById.get(r.stateId) ?? "—",
      lgaName: r.lgaId ? (lgaNameById.get(r.lgaId) ?? "—") : "—",
    })),
    total,
    pageSize: PAGE_SIZE,
  };
}

export async function getStatesInScope(scope: Scope) {
  switch (scope.role) {
    case "IGP":
      return prisma.state.findMany({ orderBy: { name: "asc" } });
    case "AIG":
      if (!scope.zoneId) return [];
      return prisma.state.findMany({ where: { zoneId: scope.zoneId }, orderBy: { name: "asc" } });
    case "CP":
    case "DPO":
      if (!scope.stateId) return [];
      return prisma.state.findMany({ where: { id: scope.stateId } });
    default:
      return [];
  }
}

export async function getLgasForState(stateId: string) {
  return prisma.lGA.findMany({ where: { stateId }, orderBy: { name: "asc" } });
}

export async function getLgaName(lgaId: string) {
  const lga = await prisma.lGA.findUnique({ where: { id: lgaId }, select: { name: true } });
  return lga?.name ?? "";
}
