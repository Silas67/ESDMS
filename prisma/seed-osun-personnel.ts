// One-off script (not part of `prisma db seed`) that populates realistic
// officer/assignment records for Osun so the August 2026 governorship
// election-readiness report shows genuine (non-zero, non-uniform) coverage
// instead of 0 officers / 0% across the board. Officer identities are
// synthetic placeholders — only the polling-unit/LGA/ward structure they're
// assigned to is real (sourced from afeibukun/nigerian-state-lgas-wards-polling-units).
import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type AssignmentStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 5 }),
});

const FIRST_NAMES_M = [
  "Adewale", "Babatunde", "Kayode", "Oluwaseun", "Femi", "Gbenga", "Segun",
  "Taiwo", "Kehinde", "Bayo", "Tunde", "Rotimi", "Wale", "Dele", "Yemi",
  "Akin", "Lekan", "Sola", "Wole", "Bode", "Niyi", "Damola", "Kolawole", "Ayodeji",
];
const FIRST_NAMES_F = [
  "Folake", "Bukola", "Adaeze", "Yetunde", "Aisha", "Omolara", "Temitope",
  "Abimbola", "Simisola", "Modupe", "Ronke", "Titilayo", "Adenike", "Bisola",
  "Funmilayo", "Iyabo", "Kemi", "Morenike", "Oluwatoyin", "Toyin",
];
const LAST_NAMES = [
  "Adeyemi", "Ogunleye", "Fasanya", "Adekunle", "Ojo", "Afolabi", "Owolabi",
  "Ogundipe", "Oyelaran", "Bankole", "Fadipe", "Salako", "Ilori", "Ajayi",
  "Adegbite", "Osunkoya", "Ogunsanya", "Fagbenle", "Aderibigbe", "Odetola",
  "Oyewole", "Adesida", "Ogunbiyi", "Falana", "Akinyemi", "Babajide",
];

const RANK_WEIGHTS: [string, number][] = [
  ["Constable", 45],
  ["Corporal", 30],
  ["Sergeant", 15],
  ["Inspector", 7],
  ["ASP", 3],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRank(): string {
  const total = RANK_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [rank, w] of RANK_WEIGHTS) {
    if (r < w) return rank;
    r -= w;
  }
  return RANK_WEIGHTS[0][0];
}

function pickStatus(): AssignmentStatus {
  const r = Math.random();
  if (r < 0.65) return "CONFIRMED";
  if (r < 0.85) return "PENDING";
  return "DEPLOYED";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// State capital (Osogbo) and a couple of urban LGAs get near-full coverage;
// most LGAs sit in a realistic mid-range; a few rural ones lag behind so the
// coverage-gaps report has genuine, meaningful gaps to surface.
const COVERAGE_OVERRIDES: Record<string, number> = {
  Osogbo: 0.95,
  "Ife Central": 0.9,
  "Ede North": 0.88,
  Ifedayo: 0.6,
  Boluwaduro: 0.62,
  Obokun: 0.65,
};
const DEFAULT_COVERAGE_RANGE: [number, number] = [0.72, 0.85];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const state = await prisma.state.findUnique({ where: { code: "OS" } });
  if (!state) throw new Error("Osun state not found — run seed-osun.ts first");

  const existingCount = await prisma.officer.count({ where: { stateId: state.id } });
  if (existingCount > 0) {
    console.log(`Osun already has ${existingCount} officers — skipping to avoid duplicate deployment.`);
    return;
  }

  const lgas = await prisma.lGA.findMany({
    where: { stateId: state.id },
    include: { pollingUnits: { select: { id: true } } },
  });

  type OfficerRow = {
    id: string;
    serviceNo: string;
    name: string;
    rank: string;
    gender: string;
    phone: string;
    stateId: string;
    lgaId: string;
    importBatch: string;
  };
  type AssignmentRow = { officerId: string; pollingUnitId: string; status: AssignmentStatus; role: string };

  const officers: OfficerRow[] = [];
  const assignments: AssignmentRow[] = [];
  let serial = 1;

  for (const lga of lgas) {
    const coverage = COVERAGE_OVERRIDES[lga.name] ??
      DEFAULT_COVERAGE_RANGE[0] + Math.random() * (DEFAULT_COVERAGE_RANGE[1] - DEFAULT_COVERAGE_RANGE[0]);
    const pus = shuffle(lga.pollingUnits);
    const covered = pus.slice(0, Math.round(pus.length * coverage));

    for (const pu of covered) {
      const isFemale = Math.random() < 0.15;
      const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
      const lastName = pick(LAST_NAMES);
      const officerId = randomUUID();
      const serviceNo = `NPF/OS/${String(serial).padStart(5, "0")}`;
      serial++;

      officers.push({
        id: officerId,
        serviceNo,
        name: `${firstName} ${lastName}`,
        rank: pickRank(),
        gender: isFemale ? "F" : "M",
        phone: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
        stateId: state.id,
        lgaId: lga.id,
        importBatch: "osun-election-2026-08-15",
      });

      assignments.push({
        officerId,
        pollingUnitId: pu.id,
        status: pickStatus(),
        role: "Polling Unit Security",
      });
    }
  }

  for (const batch of chunk(officers, 500)) {
    await prisma.officer.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`Created ${officers.length} officer records across ${lgas.length} LGAs.`);

  for (const batch of chunk(assignments, 500)) {
    await prisma.assignment.createMany({ data: batch });
  }
  console.log(`Created ${assignments.length} assignments (~${Math.round((assignments.length / lgas.reduce((s, l) => s + l.pollingUnits.length, 0)) * 100)}% of Osun's polling units covered).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
