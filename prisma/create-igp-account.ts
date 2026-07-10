// One-off script: creates the real IGP account, approved and ready to use.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  const password = process.argv[2];
  if (!password) throw new Error("Usage: tsx prisma/create-igp-account.ts <password>");

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: "igp@npf.gov.ng" },
    update: {},
    create: {
      name: "Olatunji Rilwan Disu",
      email: "igp@npf.gov.ng",
      password: hashedPassword,
      role: "IGP",
      rank: "Inspector-General of Police",
      serviceNo: "IGP-0001",
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
