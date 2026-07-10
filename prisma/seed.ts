import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

// Source: afeibukun/nigerian-state-lgas-wards-polling-units (MIT), cross-verified
// against Wikipedia's "Local government areas of Nigeria" and the official
// national total of 774 LGAs (36 states + FCT).
const LGA_DATASET_SLUG_TO_STATE_CODE: Record<string, string> = {
  abia: "AB",
  adamawa: "AD",
  "akwa-ibom": "AK",
  anambra: "AN",
  abuja: "FC",
  bauchi: "BA",
  bayelsa: "BY",
  benue: "BE",
  borno: "BO",
  "cross-river": "CR",
  delta: "DE",
  ebonyi: "EB",
  edo: "ED",
  ekiti: "EK",
  enugu: "EN",
  gombe: "GO",
  imo: "IM",
  jigawa: "JI",
  kaduna: "KD",
  kano: "KN",
  katsina: "KT",
  kebbi: "KE",
  kogi: "KO",
  kwara: "KW",
  lagos: "LA",
  nasarawa: "NA",
  niger: "NI",
  ogun: "OG",
  ondo: "ON",
  osun: "OS",
  oyo: "OY",
  plateau: "PL",
  rivers: "RI",
  sokoto: "SO",
  taraba: "TA",
  yobe: "YO",
  zamfara: "ZA",
};

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const ZONES: Record<string, { code: string; states: { name: string; code: string }[] }> = {
  "North Central": {
    code: "NC",
    states: [
      { name: "Benue", code: "BE" },
      { name: "Kogi", code: "KO" },
      { name: "Kwara", code: "KW" },
      { name: "Nasarawa", code: "NA" },
      { name: "Niger", code: "NI" },
      { name: "Plateau", code: "PL" },
      { name: "Federal Capital Territory", code: "FC" },
    ],
  },
  "North East": {
    code: "NE",
    states: [
      { name: "Adamawa", code: "AD" },
      { name: "Bauchi", code: "BA" },
      { name: "Borno", code: "BO" },
      { name: "Gombe", code: "GO" },
      { name: "Taraba", code: "TA" },
      { name: "Yobe", code: "YO" },
    ],
  },
  "North West": {
    code: "NW",
    states: [
      { name: "Jigawa", code: "JI" },
      { name: "Kaduna", code: "KD" },
      { name: "Kano", code: "KN" },
      { name: "Katsina", code: "KT" },
      { name: "Kebbi", code: "KE" },
      { name: "Sokoto", code: "SO" },
      { name: "Zamfara", code: "ZA" },
    ],
  },
  "South East": {
    code: "SE",
    states: [
      { name: "Abia", code: "AB" },
      { name: "Anambra", code: "AN" },
      { name: "Ebonyi", code: "EB" },
      { name: "Enugu", code: "EN" },
      { name: "Imo", code: "IM" },
    ],
  },
  "South South": {
    code: "SS",
    states: [
      { name: "Akwa Ibom", code: "AK" },
      { name: "Bayelsa", code: "BY" },
      { name: "Cross River", code: "CR" },
      { name: "Delta", code: "DE" },
      { name: "Edo", code: "ED" },
      { name: "Rivers", code: "RI" },
    ],
  },
  "South West": {
    code: "SW",
    states: [
      { name: "Ekiti", code: "EK" },
      { name: "Lagos", code: "LA" },
      { name: "Ogun", code: "OG" },
      { name: "Ondo", code: "ON" },
      { name: "Osun", code: "OS" },
      { name: "Oyo", code: "OY" },
    ],
  },
};

async function main() {
  for (const [zoneName, { code: zoneCode, states }] of Object.entries(ZONES)) {
    const zone = await prisma.zone.upsert({
      where: { code: zoneCode },
      update: { name: zoneName },
      create: { name: zoneName, code: zoneCode },
    });

    for (const state of states) {
      await prisma.state.upsert({
        where: { code: state.code },
        update: { name: state.name, zoneId: zone.id },
        create: { name: state.name, code: state.code, zoneId: zone.id },
      });
    }
    console.log(`Seeded zone ${zoneName} (${states.length} states)`);
  }

  const lgaDataset: { state: string; lgas: string[] }[] = JSON.parse(
    readFileSync(join(__dirname, "data", "nigeria-states-lgas.json"), "utf8")
  );

  let totalLgas = 0;
  for (const { state: slug, lgas } of lgaDataset) {
    const stateCode = LGA_DATASET_SLUG_TO_STATE_CODE[slug];
    if (!stateCode) {
      console.warn(`No state-code mapping for dataset slug "${slug}", skipping`);
      continue;
    }
    const state = await prisma.state.findUnique({ where: { code: stateCode } });
    if (!state) {
      console.warn(`State ${stateCode} not found in DB, skipping its LGAs`);
      continue;
    }

    for (const lgaSlug of lgas) {
      const name = titleCaseSlug(lgaSlug);
      const existing = await prisma.lGA.findFirst({
        where: { stateId: state.id, name: { equals: name, mode: "insensitive" } },
      });
      if (!existing) {
        await prisma.lGA.create({ data: { name, stateId: state.id } });
        totalLgas++;
      }
    }
  }
  console.log(`Seeded ${totalLgas} new LGAs (774 total expected nationally)`);
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
