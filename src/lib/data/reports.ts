import "server-only";
import { prisma } from "@/lib/prisma";
import { personnelScopeWhere, pollingUnitScopeWhere, type Scope } from "@/lib/dal";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DEPLOYED"] as const;

export async function getCoverageSummary(scope: Scope) {
  const personnelWhere = await personnelScopeWhere(scope);
  const pollingUnitWhere = await pollingUnitScopeWhere(scope);

  const [
    totalOfficers,
    totalPollingUnits,
    coveredPollingUnits,
    pending,
    confirmed,
    deployed,
    absent,
  ] = await Promise.all([
    prisma.officer.count({ where: personnelWhere }),
    prisma.pollingUnit.count({ where: pollingUnitWhere }),
    prisma.pollingUnit.count({
      where: { ...pollingUnitWhere, assignments: { some: { status: { in: [...ACTIVE_STATUSES] } } } },
    }),
    prisma.assignment.count({ where: { status: "PENDING", officer: personnelWhere } }),
    prisma.assignment.count({ where: { status: "CONFIRMED", officer: personnelWhere } }),
    prisma.assignment.count({ where: { status: "DEPLOYED", officer: personnelWhere } }),
    prisma.assignment.count({ where: { status: "ABSENT", officer: personnelWhere } }),
  ]);

  return {
    totalOfficers,
    totalPollingUnits,
    coveredPollingUnits,
    coveragePercent: totalPollingUnits > 0 ? Math.round((coveredPollingUnits / totalPollingUnits) * 100) : 0,
    byStatus: { pending, confirmed, deployed, absent },
  };
}

export async function pollingUnitCoverageByLga(lgaIds: string[]) {
  if (lgaIds.length === 0) return new Map<string, { total: number; covered: number }>();

  const [totals, covered] = await Promise.all([
    prisma.pollingUnit.groupBy({
      by: ["lgaId"],
      where: { lgaId: { in: lgaIds } },
      _count: { _all: true },
    }),
    prisma.pollingUnit.groupBy({
      by: ["lgaId"],
      where: { lgaId: { in: lgaIds }, assignments: { some: { status: { in: [...ACTIVE_STATUSES] } } } },
      _count: { _all: true },
    }),
  ]);

  const coveredByLga = new Map(covered.map((c) => [c.lgaId, c._count._all]));
  const map = new Map<string, { total: number; covered: number }>();
  for (const t of totals) {
    map.set(t.lgaId, { total: t._count._all, covered: coveredByLga.get(t.lgaId) ?? 0 });
  }
  return map;
}

export type CoverageBreakdownRow = {
  id: string;
  name: string;
  totalPollingUnits: number;
  coveredPollingUnits: number;
  coveragePercent: number;
};

/**
 * IGP/AIG get a State-level rollup (their scope spans multiple states);
 * CP/DPO get an LGA-level breakdown of their own single state/LGA.
 */
export async function getCoverageBreakdown(scope: Scope): Promise<CoverageBreakdownRow[]> {
  if (scope.role === "SPO") return [];

  if (scope.role === "IGP" || scope.role === "AIG") {
    const states = await prisma.state.findMany({
      where: scope.role === "AIG" && scope.zoneId ? { zoneId: scope.zoneId } : {},
      include: { lgas: { select: { id: true } } },
      orderBy: { name: "asc" },
    });
    const allLgaIds = states.flatMap((s) => s.lgas.map((l) => l.id));
    const coverageByLga = await pollingUnitCoverageByLga(allLgaIds);

    return states
      .map((s) => {
        const totals = s.lgas.reduce(
          (acc, l) => {
            const c = coverageByLga.get(l.id);
            return { total: acc.total + (c?.total ?? 0), covered: acc.covered + (c?.covered ?? 0) };
          },
          { total: 0, covered: 0 }
        );
        return {
          id: s.id,
          name: s.name,
          totalPollingUnits: totals.total,
          coveredPollingUnits: totals.covered,
          coveragePercent: totals.total > 0 ? Math.round((totals.covered / totals.total) * 100) : 0,
        };
      })
      .filter((r) => r.totalPollingUnits > 0);
  }

  // CP: breakdown by LGA within their own state. DPO: their own single LGA.
  const stateId = scope.stateId;
  if (!stateId) return [];
  const lgas = await prisma.lGA.findMany({
    where: scope.role === "DPO" && scope.lgaId ? { id: scope.lgaId } : { stateId },
    orderBy: { name: "asc" },
  });
  const coverageByLga = await pollingUnitCoverageByLga(lgas.map((l) => l.id));

  return lgas
    .map((l) => {
      const c = coverageByLga.get(l.id) ?? { total: 0, covered: 0 };
      return {
        id: l.id,
        name: l.name,
        totalPollingUnits: c.total,
        coveredPollingUnits: c.covered,
        coveragePercent: c.total > 0 ? Math.round((c.covered / c.total) * 100) : 0,
      };
    })
    .filter((r) => r.totalPollingUnits > 0);
}

export const GAPS_PAGE_SIZE = 20;

export async function getCoverageGaps({
  scope,
  page,
  q,
}: {
  scope: Scope;
  page: number;
  q?: string;
}) {
  const where = {
    ...(await pollingUnitScopeWhere(scope)),
    assignments: { none: { status: { in: [...ACTIVE_STATUSES] } } },
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.pollingUnit.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * GAPS_PAGE_SIZE,
      take: GAPS_PAGE_SIZE,
      include: { lga: { include: { state: true } } },
    }),
    prisma.pollingUnit.count({ where }),
  ]);

  return {
    rows: rows.map((pu) => ({
      id: pu.id,
      name: pu.name,
      inecCode: pu.inecCode,
      ward: pu.ward,
      lgaName: pu.lga.name,
      stateName: pu.lga.state.name,
    })),
    total,
    pageSize: GAPS_PAGE_SIZE,
  };
}
