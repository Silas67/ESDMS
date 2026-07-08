"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { ApproveUserSchema } from "@/lib/validations/admin";
import type { Role } from "@/generated/prisma/enums";

async function assertIsAdmin() {
  const session = await verifySession();
  if (session.user.role !== "IGP") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

const SCOPE_REQUIREMENTS: Record<Role, "zone" | "state" | "state+lga" | "none"> = {
  IGP: "none",
  AIG: "zone",
  CP: "state",
  DPO: "state+lga",
  SPO: "none",
};

export type ApproveUserState = {
  message?: string;
  success?: boolean;
} | undefined;

export async function approveUser(
  _state: ApproveUserState,
  formData: FormData
): Promise<ApproveUserState> {
  await assertIsAdmin();

  const parsed = ApproveUserSchema.safeParse({
    userId: formData.get("userId"),
    zoneId: formData.get("zoneId") || undefined,
    stateId: formData.get("stateId") || undefined,
    lgaId: formData.get("lgaId") || undefined,
  });
  if (!parsed.success) {
    return { message: "Invalid submission." };
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) {
    return { message: "User not found." };
  }
  if (target.approved) {
    return { message: "User is already approved." };
  }

  const requirement = SCOPE_REQUIREMENTS[target.role];
  if (requirement === "zone" && !parsed.data.zoneId) {
    return { message: "Select a zone for this AIG account." };
  }
  if ((requirement === "state" || requirement === "state+lga") && !parsed.data.stateId) {
    return { message: "Select a state for this account." };
  }
  if (requirement === "state+lga" && !parsed.data.lgaId) {
    return { message: "Select an LGA for this DPO account." };
  }

  // Validate the referenced geography actually exists and is internally consistent
  // (e.g. the chosen LGA really belongs to the chosen state) before trusting it.
  if (parsed.data.zoneId) {
    const zone = await prisma.zone.findUnique({ where: { id: parsed.data.zoneId } });
    if (!zone) return { message: "Selected zone not found." };
  }
  if (parsed.data.stateId) {
    const state = await prisma.state.findUnique({ where: { id: parsed.data.stateId } });
    if (!state) return { message: "Selected state not found." };
  }
  if (parsed.data.lgaId) {
    const lga = await prisma.lGA.findFirst({
      where: { id: parsed.data.lgaId, stateId: parsed.data.stateId },
    });
    if (!lga) return { message: "Selected LGA does not belong to the selected state." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      approved: true,
      zoneId: requirement === "zone" ? parsed.data.zoneId : null,
      stateId: requirement === "state" || requirement === "state+lga" ? parsed.data.stateId : null,
      lgaId: requirement === "state+lga" ? parsed.data.lgaId : null,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function rejectUser(userId: string) {
  const session = await assertIsAdmin();
  if (userId === session.user.id) throw new Error("Cannot reject your own account.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.approved) {
    throw new Error("Only pending accounts can be rejected.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function suspendUser(userId: string) {
  const session = await assertIsAdmin();
  if (userId === session.user.id) throw new Error("Cannot suspend your own account.");

  await prisma.user.update({ where: { id: userId }, data: { suspended: true } });
  revalidatePath("/admin");
}

export async function reinstateUser(userId: string) {
  await assertIsAdmin();
  await prisma.user.update({ where: { id: userId }, data: { suspended: false } });
  revalidatePath("/admin");
}
