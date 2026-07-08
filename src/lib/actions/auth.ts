"use server";

import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { LoginSchema, RegisterSchema } from "@/lib/validations/auth";

export type LoginState = {
  errors?: { email?: string[]; password?: string[] };
  message?: string;
} | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      switch (error.code) {
        case "account-suspended":
          return { message: "This account has been suspended. Contact your command administrator." };
        case "account-pending-approval":
          return { message: "This account is awaiting admin approval." };
        default:
          return { message: "Invalid email or password." };
      }
    }
    throw error;
  }

  return undefined;
}

export type RegisterState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    serviceNo: formData.get("serviceNo"),
    rank: formData.get("rank"),
    role: formData.get("role"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, serviceNo, rank, role, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { serviceNo }] },
  });
  if (existing) {
    return { message: "An account with this email or service number already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      serviceNo,
      rank,
      role,
      password: hashedPassword,
      approved: false,
      suspended: false,
    },
  });

  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
