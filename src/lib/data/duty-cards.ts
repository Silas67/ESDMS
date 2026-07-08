import "server-only";
import { prisma } from "@/lib/prisma";
import { personnelScopeWhere, type Scope } from "@/lib/dal";

export const DUTY_CARDS_PAGE_SIZE = 20;

const ELIGIBLE_STATUSES = ["CONFIRMED", "DEPLOYED"] as const;

export async function getDutyCardEligibleAssignments({
  scope,
  page,
  q,
}: {
  scope: Scope;
  page: number;
  q?: string;
}) {
  const where = {
    status: { in: [...ELIGIBLE_STATUSES] },
    officer: await personnelScopeWhere(scope),
    ...(q
      ? {
          OR: [
            { officer: { name: { contains: q, mode: "insensitive" as const } } },
            { officer: { serviceNo: { contains: q, mode: "insensitive" as const } } },
            { pollingUnit: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DUTY_CARDS_PAGE_SIZE,
      take: DUTY_CARDS_PAGE_SIZE,
      include: {
        officer: true,
        pollingUnit: { include: { lga: { include: { state: true } } } },
        dutyCard: true,
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  return {
    rows: rows.map((a) => ({
      id: a.id,
      status: a.status,
      role: a.role,
      officerName: a.officer.name,
      officerServiceNo: a.officer.serviceNo,
      pollingUnitName: a.pollingUnit.name,
      pollingUnitCode: a.pollingUnit.inecCode,
      lgaName: a.pollingUnit.lga.name,
      stateName: a.pollingUnit.lga.state.name,
      generatedAt: a.dutyCard?.generatedAt ?? null,
    })),
    total,
    pageSize: DUTY_CARDS_PAGE_SIZE,
  };
}
