// One-off utility: sets a user's password directly (for admin/dev use when
// there's no other account with permission to do it yet, e.g. bootstrapping
// the first IGP account).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: tsx prisma/set-password.ts <email> <newPassword>");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log("Password updated for:", user.email);
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
