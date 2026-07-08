import "server-only";
import { prisma } from "@/lib/prisma";
import { personnelScopeWhere, pollingUnitScopeWhere, type Scope } from "@/lib/dal";

export const ASSIGNMENTS_PAGE_SIZE = 20;
const PICKER_LIMIT = 200;

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DEPLOYED"] as const;

export async function getAssignmentsPage({
  scope,
  page,
  q,
}: {
  scope: Scope;
  page: number;
  q?: string;
}) {
  const officerWhere = await personnelScopeWhere(scope);
  const where = {
    officer: officerWhere,
    ...(q
      ? {
          OR: [
            { officer: { name: { contains: q, mode: "insensitive" as const } } },
            { officer: { serviceNo: { contains: q, mode: "insensitive" as const } } },
            { pollingUnit: { name: { contains: q, mode: "insensitive" as const } } },
            { pollingUnit: { inecCode: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ASSIGNMENTS_PAGE_SIZE,
      take: ASSIGNMENTS_PAGE_SIZE,
      include: {
        officer: true,
        pollingUnit: { include: { lga: { include: { state: true } } } },
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  return {
    rows: rows.map((a) => ({
      id: a.id,
      role: a.role,
      status: a.status,
      createdAt: a.createdAt,
      officerName: a.officer.name,
      officerServiceNo: a.officer.serviceNo,
      pollingUnitName: a.pollingUnit.name,
      pollingUnitCode: a.pollingUnit.inecCode,
      lgaName: a.pollingUnit.lga.name,
      stateName: a.pollingUnit.lga.state.name,
    })),
    total,
    pageSize: ASSIGNMENTS_PAGE_SIZE,
  };
}

export async function getUnassignedOfficers(scope: Scope) {
  const where = await personnelScopeWhere(scope);
  const officers = await prisma.officer.findMany({
    where: {
      ...where,
      assignments: { none: { status: { in: [...ACTIVE_STATUSES] } } },
    },
    orderBy: { name: "asc" },
    take: PICKER_LIMIT,
    select: { id: true, name: true, serviceNo: true, rank: true },
  });
  return officers;
}

export async function getPollingUnitsForAllocation(scope: Scope) {
  const where = await pollingUnitScopeWhere(scope);
  const units = await prisma.pollingUnit.findMany({
    where,
    orderBy: { name: "asc" },
    take: PICKER_LIMIT,
    select: {
      id: true,
      name: true,
      inecCode: true,
      capacity: true,
      _count: { select: { assignments: { where: { status: { in: [...ACTIVE_STATUSES] } } } } },
    },
  });
  return units.map((u) => ({
    id: u.id,
    name: u.name,
    inecCode: u.inecCode,
    capacity: u.capacity,
    assignedCount: u._count.assignments,
  }));
}
