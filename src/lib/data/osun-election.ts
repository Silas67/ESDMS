import "server-only";
import { prisma } from "@/lib/prisma";
import { pollingUnitCoverageByLga, type CoverageBreakdownRow } from "@/lib/data/reports";

const SENATORIAL_DISTRICT_ORDER = ["Osun East", "Osun Central", "Osun West"];

export type OsunLgaRow = CoverageBreakdownRow & { senatorialDistrict: string };

export type OsunElectionReadiness = {
  stateId: string;
  zoneId: string;
  totalOfficers: number;
  totalPollingUnits: number;
  coveredPollingUnits: number;
  coveragePercent: number;
  districts: CoverageBreakdownRow[];
  lgasByDistrict: { district: string; lgas: OsunLgaRow[] }[];
};

/**
 * Osun-specific election-readiness rollup (senatorial district + LGA levels)
 * for the August 2026 governorship election. Not scope-filtered by design —
 * visibility (who's allowed to see this section at all) is decided by the
 * caller (Reports page), not by this query.
 */
export async function getOsunElectionReadiness(): Promise<OsunElectionReadiness | null> {
  const state = await prisma.state.findUnique({ where: { code: "OS" } });
  if (!state) return null;

  const lgas = await prisma.lGA.findMany({
    where: { stateId: state.id },
    orderBy: { name: "asc" },
  });
  if (lgas.length === 0) return null;

  const [coverageByLga, totalOfficers] = await Promise.all([
    pollingUnitCoverageByLga(lgas.map((l) => l.id)),
    prisma.officer.count({ where: { stateId: state.id } }),
  ]);

  const lgaRows: OsunLgaRow[] = lgas.map((l) => {
    const c = coverageByLga.get(l.id) ?? { total: 0, covered: 0 };
    return {
      id: l.id,
      name: l.name,
      senatorialDistrict: l.senatorialDistrict ?? "Unassigned",
      totalPollingUnits: c.total,
      coveredPollingUnits: c.covered,
      coveragePercent: c.total > 0 ? Math.round((c.covered / c.total) * 100) : 0,
    };
  });

  const districtMap = new Map<string, OsunLgaRow[]>();
  for (const row of lgaRows) {
    const list = districtMap.get(row.senatorialDistrict) ?? [];
    list.push(row);
    districtMap.set(row.senatorialDistrict, list);
  }

  const lgasByDistrict = [...districtMap.entries()]
    .sort(([a], [b]) => {
      const ai = SENATORIAL_DISTRICT_ORDER.indexOf(a);
      const bi = SENATORIAL_DISTRICT_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([district, districtLgas]) => ({ district, lgas: districtLgas }));

  const districts: CoverageBreakdownRow[] = lgasByDistrict.map(({ district, lgas: districtLgas }) => {
    const totals = districtLgas.reduce(
      (acc, l) => ({
        total: acc.total + l.totalPollingUnits,
        covered: acc.covered + l.coveredPollingUnits,
      }),
      { total: 0, covered: 0 }
    );
    return {
      id: district,
      name: district,
      totalPollingUnits: totals.total,
      coveredPollingUnits: totals.covered,
      coveragePercent: totals.total > 0 ? Math.round((totals.covered / totals.total) * 100) : 0,
    };
  });

  const totalPollingUnits = lgaRows.reduce((sum, l) => sum + l.totalPollingUnits, 0);
  const coveredPollingUnits = lgaRows.reduce((sum, l) => sum + l.coveredPollingUnits, 0);

  return {
    stateId: state.id,
    zoneId: state.zoneId,
    totalOfficers,
    totalPollingUnits,
    coveredPollingUnits,
    coveragePercent: totalPollingUnits > 0 ? Math.round((coveredPollingUnits / totalPollingUnits) * 100) : 0,
    districts,
    lgasByDistrict,
  };
}
