// One-off script (not part of `prisma db seed`): assigns senatorial
// districts to Osun's 30 LGAs and imports real Osun ward + polling-unit
// names sourced from afeibukun/nigerian-state-lgas-wards-polling-units
// (MIT), cross-checked against the boss-supplied official rollup
// (osun_deployment_summary.csv: 332 registration areas, 3010 polling
// units). Our dataset yields 2,984 polling units (99.1% match) — the
// small gap is concentrated in Ede North/South and Osogbo/Oriade, most
// likely a slightly different revision of the same INEC register.
// inecCode values are synthetic, systematically-generated identifiers
// (OS/<LGA>/<ward#>/<pu#>), same convention as the FCT import, since this
// dataset doesn't include INEC's actual numeric PU codes.
//
// Uses bulk findMany/createMany rather than per-row round trips — ~3,000
// individual round trips against the Supabase pooler from this environment
// would take upwards of 20-30 minutes; batched, it's a handful of calls.
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
  "atakumosa-east": "ATE",
  "atakumosa-west": "ATW",
  ayedaade: "AYD",
  ayedire: "AYR",
  boluwaduro: "BLW",
  boripe: "BRP",
  "ede-north": "EDN",
  "ede-south": "EDS",
  egbedore: "EGB",
  ejigbo: "EJG",
  "ife-central": "IFC",
  "ife-east": "IFE",
  "ife-north": "IFN",
  "ife-south": "IFS",
  ifedayo: "IFD",
  ifelodun: "IFL",
  ila: "ILA",
  "ilesa-east": "ILE",
  "ilesa-west": "ILW",
  irepodun: "IRP",
  irewole: "IRW",
  isokan: "ISK",
  iwo: "IWO",
  obokun: "OBK",
  "odo-otin": "ODO",
  "ola-oluwa": "OLO",
  olorunda: "OLR",
  oriade: "ORD",
  orolu: "ORL",
  osogbo: "OSG",
};

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function main() {
  const senatorialDistricts: Record<string, string[]> = JSON.parse(
    readFileSync(join(__dirname, "data", "osun-senatorial-districts.json"), "utf8")
  );
  const slugToDistrict = new Map<string, string>();
  for (const [district, slugs] of Object.entries(senatorialDistricts)) {
    for (const slug of slugs) slugToDistrict.set(slug, district);
  }

  const dataset: { state: string; lgas: { lga: string; wards: { ward: string; polling_units: string[] }[] }[] }[] =
    JSON.parse(readFileSync(join(__dirname, "data", "osun-lgas-wards-polling-units.json"), "utf8"));

  const osun = dataset.find((s) => s.state === "osun");
  if (!osun) throw new Error("Osun not found in dataset");

  const state = await prisma.state.findUnique({ where: { code: "OS" } });
  if (!state) throw new Error("Osun state row not found — run `prisma db seed` first");

  const dbLgas = await prisma.lGA.findMany({ where: { stateId: state.id } });
  const lgaByName = new Map(dbLgas.map((l) => [l.name.toLowerCase(), l]));

  // 1. Assign senatorial districts (30 rows — cheap either way, one query per LGA is fine).
  let districtsAssigned = 0;
  for (const lga of osun.lgas) {
    const lgaName = titleCaseSlug(lga.lga);
    const lgaRow = lgaByName.get(lgaName.toLowerCase());
    if (!lgaRow) {
      console.warn(`LGA "${lgaName}" not found under Osun, skipping`);
      continue;
    }
    const district = slugToDistrict.get(lga.lga);
    if (!district) {
      console.warn(`No senatorial district mapping for "${lgaName}"`);
      continue;
    }
    await prisma.lGA.update({ where: { id: lgaRow.id }, data: { senatorialDistrict: district } });
    districtsAssigned++;
  }
  console.log(`Assigned senatorial district to ${districtsAssigned} LGAs.`);

  // 2. Build every candidate polling unit row in memory first.
  type Row = { inecCode: string; name: string; lgaId: string; ward: string };
  const candidates: Row[] = [];

  for (const lga of osun.lgas) {
    const lgaName = titleCaseSlug(lga.lga);
    const lgaRow = lgaByName.get(lgaName.toLowerCase());
    if (!lgaRow) continue;

    const abbrev = LGA_ABBREV[lga.lga] ?? lga.lga.slice(0, 3).toUpperCase();

    for (let wardIdx = 0; wardIdx < lga.wards.length; wardIdx++) {
      const ward = lga.wards[wardIdx];
      const wardName = titleCaseSlug(ward.ward);

      for (let puIdx = 0; puIdx < ward.polling_units.length; puIdx++) {
        const puName = titleCaseSlug(ward.polling_units[puIdx]);
        const inecCode = `OS/${abbrev}/${String(wardIdx + 1).padStart(2, "0")}/${String(puIdx + 1).padStart(3, "0")}`;
        candidates.push({ inecCode, name: puName, lgaId: lgaRow.id, ward: wardName });
      }
    }
  }

  // 3. One bulk existence check, then one bulk insert for whatever's new.
  const existing = await prisma.pollingUnit.findMany({
    where: { inecCode: { in: candidates.map((c) => c.inecCode) } },
    select: { inecCode: true },
  });
  const existingSet = new Set(existing.map((e) => e.inecCode));
  const toCreate = candidates.filter((c) => !existingSet.has(c.inecCode));

  if (toCreate.length > 0) {
    const result = await prisma.pollingUnit.createMany({ data: toCreate, skipDuplicates: true });
    console.log(`Created ${result.count} polling units, skipped ${candidates.length - toCreate.length} already-existing.`);
  } else {
    console.log(`All ${candidates.length} polling units already existed, nothing created.`);
  }
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
