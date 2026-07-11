// One-off script: creates a clearly-labeled demo account (not impersonating
// any real officer) scoped to FCT, for sharing the MVP with reviewers who
// shouldn't get the real IGP credentials.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  const password = process.argv[2];
  if (!password) throw new Error("Usage: tsx prisma/create-demo-account.ts <password>");

  const fct = await prisma.state.findUnique({ where: { code: "FC" } });
  if (!fct) throw new Error("FCT state not found — run `prisma db seed` first");

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@npf.gov.ng" },
    update: {},
    create: {
      name: "Demo Reviewer",
      email: "demo@npf.gov.ng",
      password: hashedPassword,
      role: "CP",
      rank: "Demo Account",
      serviceNo: "DEMO-0001",
      stateId: fct.id,
      approved: true,
      suspended: false,
    },
  });

  console.log("Created:", { id: user.id, name: user.name, email: user.email, role: user.role });
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
