import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export class AccountSuspendedError extends CredentialsSignin {
  code = "account-suspended";
}

export class AccountPendingApprovalError extends CredentialsSignin {
  code = "account-pending-approval";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const passwordsMatch = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!passwordsMatch) return null;

        if (user.suspended) {
          throw new AccountSuspendedError();
        }
        if (!user.approved) {
          throw new AccountPendingApprovalError();
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          stateId: user.stateId,
          lgaId: user.lgaId,
          zoneId: user.zoneId,
          serviceNo: user.serviceNo,
          rank: user.rank,
        };
      },
    }),
  ],
});
