import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    stateId: string | null;
    lgaId: string | null;
    zoneId: string | null;
    serviceNo: string | null;
    rank: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      stateId: string | null;
      lgaId: string | null;
      zoneId: string | null;
      serviceNo: string | null;
      rank: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    stateId: string | null;
    lgaId: string | null;
    zoneId: string | null;
    serviceNo: string | null;
    rank: string | null;
  }
}

const protectedPrefixes = [
  "/dashboard",
  "/personnel",
  "/polling-units",
  "/allocation",
  "/duty-cards",
  "/reports",
  "/admin",
];

export const authConfig = {
  // Vercel (and most reverse-proxy hosts) set X-Forwarded-Host correctly,
  // so trusting it here is safe; without this, Auth.js rejects every
  // request in production with "UntrustedHost" (dev mode trusts implicitly,
  // which is why this only surfaces in a production build).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isProtected = protectedPrefixes.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix)
      );
      if (!isProtected) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.stateId = user.stateId;
        token.lgaId = user.lgaId;
        token.zoneId = user.zoneId;
        token.serviceNo = user.serviceNo;
        token.rank = user.rank;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.stateId = token.stateId;
      session.user.lgaId = token.lgaId;
      session.user.zoneId = token.zoneId;
      session.user.serviceNo = token.serviceNo;
      session.user.rank = token.rank;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
