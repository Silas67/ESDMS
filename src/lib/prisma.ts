import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazily construct the adapter (and its pg.Pool) only when there's no
// cached client to reuse — Supabase's session-mode pooler caps concurrent
// clients at 15, and constructing a new pool unconditionally on every
// module evaluation (e.g. Turbopack Fast Refresh in dev) can exhaust that
// budget even though the pool never ends up used.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 5 }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
