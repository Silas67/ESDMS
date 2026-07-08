import "server-only";
import { prisma } from "@/lib/prisma";
import { pollingUnitScopeWhere, type Scope } from "@/lib/dal";

export const PU_PAGE_SIZE = 20;

export async function getPollingUnitsPage({
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
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { inecCode: { contains: q, mode: "insensitive" as const } },
            { ward: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.pollingUnit.findMany({
      where,
      orderBy: { inecCode: "asc" },
      skip: (page - 1) * PU_PAGE_SIZE,
      take: PU_PAGE_SIZE,
      include: { lga: { include: { state: true } } },
    }),
    prisma.pollingUnit.count({ where }),
  ]);

  return {
    rows: rows.map((pu) => ({
      id: pu.id,
      inecCode: pu.inecCode,
      name: pu.name,
      ward: pu.ward,
      address: pu.address,
      capacity: pu.capacity,
      lgaName: pu.lga.name,
      stateName: pu.lga.state.name,
    })),
    total,
    pageSize: PU_PAGE_SIZE,
  };
}
