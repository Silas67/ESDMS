"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, personnelScopeWhere, pollingUnitScopeWhere, type Scope } from "@/lib/dal";
import { CreateAssignmentSchema } from "@/lib/validations/allocation";
import type { AssignmentStatus } from "@/generated/prisma/enums";

const MANAGER_ROLES = ["IGP", "AIG", "CP", "DPO"] as const;
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DEPLOYED"] as const;
const VALID_STATUSES: AssignmentStatus[] = ["PENDING", "CONFIRMED", "DEPLOYED", "ABSENT"];

async function requireManagerScope(): Promise<Scope> {
  const session = await verifySession();
  if (!MANAGER_ROLES.includes(session.user.role as (typeof MANAGER_ROLES)[number])) {
    throw new Error("FORBIDDEN");
  }
  return {
    role: session.user.role,
    zoneId: session.user.zoneId,
    serviceNo: session.user.serviceNo,
    stateId: session.user.stateId,
    lgaId: session.user.lgaId,
  };
}

export type CreateAssignmentState = {
  message?: string;
  success?: boolean;
} | undefined;

export async function createAssignment(
  _state: CreateAssignmentState,
  formData: FormData
): Promise<CreateAssignmentState> {
  const scope = await requireManagerScope();

  const parsed = CreateAssignmentSchema.safeParse({
    officerId: formData.get("officerId"),
    pollingUnitId: formData.get("pollingUnitId"),
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }

  const [officer, pollingUnit] = await Promise.all([
    prisma.officer.findFirst({
      where: { id: parsed.data.officerId, ...(await personnelScopeWhere(scope)) },
    }),
    prisma.pollingUnit.findFirst({
      where: { id: parsed.data.pollingUnitId, ...(await pollingUnitScopeWhere(scope)) },
    }),
  ]);
  if (!officer) return { message: "Officer not found in your command scope." };
  if (!pollingUnit) return { message: "Polling unit not found in your command scope." };

  const existingActive = await prisma.assignment.findFirst({
    where: { officerId: officer.id, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (existingActive) {
    return { message: `${officer.name} already has an active assignment.` };
  }

  await prisma.assignment.create({
    data: {
      officerId: officer.id,
      pollingUnitId: pollingUnit.id,
      role: parsed.data.role || null,
      status: "PENDING",
    },
  });

  revalidatePath("/allocation");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAssignmentStatus(assignmentId: string, status: AssignmentStatus) {
  const scope = await requireManagerScope();
  if (!VALID_STATUSES.includes(status)) throw new Error("Invalid status.");

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, officer: await personnelScopeWhere(scope) },
  });
  if (!assignment) throw new Error("Assignment not found in your command scope.");

  await prisma.assignment.update({ where: { id: assignmentId }, data: { status } });
  revalidatePath("/allocation");
  revalidatePath("/dashboard");
}

export async function deleteAssignment(assignmentId: string) {
  const scope = await requireManagerScope();

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, officer: await personnelScopeWhere(scope) },
  });
  if (!assignment) throw new Error("Assignment not found in your command scope.");

  try {
    await prisma.assignment.delete({ where: { id: assignmentId } });
  } catch {
    throw new Error("Could not remove this assignment — it may already have a duty card issued.");
  }
  revalidatePath("/allocation");
  revalidatePath("/dashboard");
}
