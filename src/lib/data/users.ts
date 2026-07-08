import "server-only";
import { prisma } from "@/lib/prisma";

export const USERS_PAGE_SIZE = 20;

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  rank: true,
  serviceNo: true,
  zoneId: true,
  stateId: true,
  lgaId: true,
  approved: true,
  suspended: true,
  createdAt: true,
  lastLogin: true,
} as const;

async function withLocationNames<T extends { stateId: string | null; lgaId: string | null; zoneId: string | null }>(
  users: T[]
) {
  const stateIds = [...new Set(users.map((u) => u.stateId).filter((id): id is string => !!id))];
  const lgaIds = [...new Set(users.map((u) => u.lgaId).filter((id): id is string => !!id))];
  const zoneIds = [...new Set(users.map((u) => u.zoneId).filter((id): id is string => !!id))];

  const [states, lgas, zones] = await Promise.all([
    stateIds.length ? prisma.state.findMany({ where: { id: { in: stateIds } }, select: { id: true, name: true } }) : [],
    lgaIds.length ? prisma.lGA.findMany({ where: { id: { in: lgaIds } }, select: { id: true, name: true } }) : [],
    zoneIds.length ? prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } }) : [],
  ]);
  const stateName = new Map(states.map((s) => [s.id, s.name]));
  const lgaName = new Map(lgas.map((l) => [l.id, l.name]));
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));

  return users.map((u) => ({
    ...u,
    stateName: u.stateId ? (stateName.get(u.stateId) ?? "—") : null,
    lgaName: u.lgaId ? (lgaName.get(u.lgaId) ?? "—") : null,
    zoneName: u.zoneId ? (zoneName.get(u.zoneId) ?? "—") : null,
  }));
}

export async function getPendingUsers() {
  const users = await prisma.user.findMany({
    where: { approved: false, suspended: false },
    orderBy: { createdAt: "asc" },
    select: USER_SAFE_SELECT,
  });
  return withLocationNames(users);
}

export async function getUsersPage({ page, q }: { page: number; q?: string }) {
  const where = {
    approved: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { serviceNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: USER_SAFE_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { rows: await withLocationNames(rows), total, pageSize: USERS_PAGE_SIZE };
}

export async function getZones() {
  return prisma.zone.findMany({ orderBy: { name: "asc" } });
}

export async function getAllStates() {
  return prisma.state.findMany({ orderBy: { name: "asc" } });
}
