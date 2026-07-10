// One-off script (not part of `prisma db seed`) that imports real FCT ward
// and polling-unit names sourced from afeibukun/nigerian-state-lgas-wards-polling-units
// (MIT). PU names/wards/LGAs are real; inecCode values are synthetic,
// systematically-generated identifiers (FC/<lga>/<ward#>/<pu#>) since this
// dataset doesn't include INEC's actual numeric PU codes.
import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const LGA_ABBREV: Record<string, string> = {
  abaji: "ABJ",
  "abuja-municipal": "AMC",
  bwari: "BWR",
  gwagwalada: "GWG",
  kuje: "KUJ",
  kwali: "KWL",
};

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function main() {
  const dataset: { state: string; lgas: { lga: string; wards: { ward: string; polling_units: string[] }[] }[] }[] =
    JSON.parse(readFileSync(join(__dirname, "data", "fct-lgas-wards-polling-units.json"), "utf8"));

  const fct = dataset.find((s) => s.state === "abuja");
  if (!fct) throw new Error("FCT not found in dataset");

  const state = await prisma.state.findUnique({ where: { code: "FC" } });
  if (!state) throw new Error("FCT state row not found — run `prisma db seed` first");

  let created = 0;
  let skipped = 0;

  for (const lga of fct.lgas) {
    const lgaName = titleCaseSlug(lga.lga);
    const lgaRow = await prisma.lGA.findFirst({
      where: { stateId: state.id, name: { equals: lgaName, mode: "insensitive" } },
    });
    if (!lgaRow) {
      console.warn(`LGA "${lgaName}" not found under FCT, skipping its polling units`);
      continue;
    }

    const abbrev = LGA_ABBREV[lga.lga] ?? lga.lga.slice(0, 3).toUpperCase();

    for (let wardIdx = 0; wardIdx < lga.wards.length; wardIdx++) {
      const ward = lga.wards[wardIdx];
      const wardName = titleCaseSlug(ward.ward);

      for (let puIdx = 0; puIdx < ward.polling_units.length; puIdx++) {
        const puName = titleCaseSlug(ward.polling_units[puIdx]);
        const inecCode = `FC/${abbrev}/${String(wardIdx + 1).padStart(2, "0")}/${String(puIdx + 1).padStart(3, "0")}`;

        const existing = await prisma.pollingUnit.findUnique({ where: { inecCode } });
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.pollingUnit.create({
          data: {
            inecCode,
            name: puName,
            lgaId: lgaRow.id,
            ward: wardName,
          },
        });
        created++;
      }
    }
    console.log(`${lgaName}: done`);
  }

  console.log(`\nCreated ${created} polling units, skipped ${skipped} already-existing.`);
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
