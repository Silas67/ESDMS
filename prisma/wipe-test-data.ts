// One-off script: wipes every test/fixture row created during development
// (Playwright test accounts, fake officers, fabricated Lagos polling units)
// while preserving real reference data (Zones/States/LGAs, and the real
// FCT polling units imported from seed-fct-polling-units.ts).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  const dutyCards = await prisma.dutyCard.deleteMany({});
  console.log(`Deleted ${dutyCards.count} duty cards`);

  const assignments = await prisma.assignment.deleteMany({});
  console.log(`Deleted ${assignments.count} assignments`);

  const officers = await prisma.officer.deleteMany({});
  console.log(`Deleted ${officers.count} officers`);

  // Only the fabricated Lagos test polling units (inecCode = PU-<timestamp>-N),
  // never the real FCT ones (inecCode = FC/<LGA>/<ward>/<pu>).
  const fakePUs = await prisma.pollingUnit.deleteMany({
    where: { inecCode: { startsWith: "PU-" } },
  });
  console.log(`Deleted ${fakePUs.count} fabricated test polling units`);

  const users = await prisma.user.deleteMany({});
  console.log(`Deleted ${users.count} users`);

  const batches = await prisma.importBatch.deleteMany({});
  console.log(`Deleted ${batches.count} import batches`);

  console.log("\nDone. Zones/States/LGAs and real FCT polling units preserved.");
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
