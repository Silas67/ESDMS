import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

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
