"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { verifySession, type Scope } from "@/lib/dal";
import {
  CreateOfficerSchema,
  ImportOfficerRowSchema,
  type CreateOfficerInput,
} from "@/lib/validations/officer";

const PERSONNEL_MANAGER_ROLES = ["IGP", "AIG", "CP", "DPO"] as const;

export async function getLgasForStateAction(stateId: string) {
  await verifySession();
  if (!stateId) return [];
  return prisma.lGA.findMany({ where: { stateId }, orderBy: { name: "asc" } });
}

function assertCanManagePersonnel(scope: Scope) {
  if (!PERSONNEL_MANAGER_ROLES.includes(scope.role as (typeof PERSONNEL_MANAGER_ROLES)[number])) {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Never trust a client-submitted stateId/lgaId beyond what the caller's
 * role is actually scoped to. CP/DPO get their location forced from the
 * session; AIG/IGP get their submission checked against the allowed set.
 */
async function resolveOfficerLocation(
  scope: Scope,
  submittedStateId: string,
  submittedLgaId: string | undefined
): Promise<{ stateId: string; lgaId: string | null }> {
  if (scope.role === "DPO") {
    if (!scope.stateId || !scope.lgaId) throw new Error("FORBIDDEN");
    return { stateId: scope.stateId, lgaId: scope.lgaId };
  }

  if (scope.role === "CP") {
    if (!scope.stateId) throw new Error("FORBIDDEN");
    const lga = submittedLgaId
      ? await prisma.lGA.findFirst({ where: { id: submittedLgaId, stateId: scope.stateId } })
      : null;
    return { stateId: scope.stateId, lgaId: lga?.id ?? null };
  }

  if (scope.role === "AIG") {
    if (!scope.zoneId) throw new Error("FORBIDDEN");
    const state = await prisma.state.findFirst({
      where: { id: submittedStateId, zoneId: scope.zoneId },
    });
    if (!state) throw new Error("FORBIDDEN");
    const lga = submittedLgaId
      ? await prisma.lGA.findFirst({ where: { id: submittedLgaId, stateId: state.id } })
      : null;
    return { stateId: state.id, lgaId: lga?.id ?? null };
  }

  // IGP
  const state = await prisma.state.findUnique({ where: { id: submittedStateId } });
  if (!state) throw new Error("FORBIDDEN");
  const lga = submittedLgaId
    ? await prisma.lGA.findFirst({ where: { id: submittedLgaId, stateId: state.id } })
    : null;
  return { stateId: state.id, lgaId: lga?.id ?? null };
}

export type CreateOfficerState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function createOfficer(
  input: CreateOfficerInput
): Promise<CreateOfficerState> {
  const session = await verifySession();
  const scope: Scope = {
    role: session.user.role,
    zoneId: session.user.zoneId,
    serviceNo: session.user.serviceNo,
    stateId: session.user.stateId,
    lgaId: session.user.lgaId,
  };
  assertCanManagePersonnel(scope);

  const parsed = CreateOfficerSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.officer.findUnique({
    where: { serviceNo: parsed.data.serviceNo },
  });
  if (existing) {
    return { message: "An officer with this service number already exists." };
  }

  const { stateId, lgaId } = await resolveOfficerLocation(
    scope,
    parsed.data.stateId,
    parsed.data.lgaId || undefined
  );

  await prisma.officer.create({
    data: {
      serviceNo: parsed.data.serviceNo,
      name: parsed.data.name,
      rank: parsed.data.rank,
      gender: parsed.data.gender || null,
      phone: parsed.data.phone || null,
      stateId,
      lgaId,
    },
  });

  revalidatePath("/personnel");
  return { success: true };
}

export type ImportOfficersState = {
  message?: string;
  success?: boolean;
  imported?: number;
  skipped?: { row: number; reason: string }[];
} | undefined;

const MAX_IMPORT_ROWS = 5000;

export async function importOfficers(
  _state: ImportOfficersState,
  formData: FormData
): Promise<ImportOfficersState> {
  const session = await verifySession();
  const scope: Scope = {
    role: session.user.role,
    zoneId: session.user.zoneId,
    serviceNo: session.user.serviceNo,
    stateId: session.user.stateId,
    lgaId: session.user.lgaId,
  };
  assertCanManagePersonnel(scope);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose an Excel file to import." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { message: "File is too large (max 5MB)." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { message: "Could not read this file. Make sure it's a valid .xlsx file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { message: "The workbook has no sheets." };
  }

  const header = (sheet.getRow(1).values as unknown[]).map((v) =>
    String(v ?? "").trim().toLowerCase()
  );
  const colIndex = (name: string) => header.indexOf(name);
  const cols = {
    serviceNo: colIndex("serviceno"),
    name: colIndex("name"),
    rank: colIndex("rank"),
    gender: colIndex("gender"),
    phone: colIndex("phone"),
    stateCode: colIndex("statecode"),
    lgaName: colIndex("lga"),
  };

  if (cols.serviceNo === -1 || cols.name === -1 || cols.rank === -1 || cols.stateCode === -1) {
    return {
      message:
        "Missing required columns. Expected headers: serviceNo, name, rank, stateCode, and optionally gender, phone, lga.",
    };
  }

  const states = await prisma.state.findMany();
  const stateByCode = new Map(states.map((s) => [s.code.toUpperCase(), s]));
  const allowedStateIds = new Set(
    (
      scope.role === "IGP"
        ? states
        : scope.role === "AIG"
          ? states.filter((s) => s.zoneId === scope.zoneId)
          : states.filter((s) => s.id === scope.stateId)
    ).map((s) => s.id)
  );

  const rowCount = sheet.rowCount;
  if (rowCount - 1 > MAX_IMPORT_ROWS) {
    return { message: `Too many rows. Max ${MAX_IMPORT_ROWS} officers per import.` };
  }

  const toCreate: {
    serviceNo: string;
    name: string;
    rank: string;
    gender: string | null;
    phone: string | null;
    stateId: string;
    lgaId: string | null;
  }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seenServiceNos = new Set<string>();

  for (let r = 2; r <= rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw = {
      serviceNo: String(row.getCell(cols.serviceNo).value ?? "").trim(),
      name: String(row.getCell(cols.name).value ?? "").trim(),
      rank: String(row.getCell(cols.rank).value ?? "").trim(),
      gender: cols.gender !== -1 ? String(row.getCell(cols.gender).value ?? "").trim() : "",
      phone: cols.phone !== -1 ? String(row.getCell(cols.phone).value ?? "").trim() : "",
      stateCode: String(row.getCell(cols.stateCode).value ?? "").trim(),
      lgaName: cols.lgaName !== -1 ? String(row.getCell(cols.lgaName).value ?? "").trim() : "",
    };

    if (!raw.serviceNo && !raw.name) continue;

    const parsed = ImportOfficerRowSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push({ row: r, reason: "Missing required fields (serviceNo, name, rank, stateCode)." });
      continue;
    }

    if (seenServiceNos.has(parsed.data.serviceNo)) {
      skipped.push({ row: r, reason: `Duplicate serviceNo in file: ${parsed.data.serviceNo}` });
      continue;
    }

    const state = stateByCode.get(parsed.data.stateCode.toUpperCase());
    if (!state) {
      skipped.push({ row: r, reason: `Unknown stateCode: ${parsed.data.stateCode}` });
      continue;
    }
    if (!allowedStateIds.has(state.id)) {
      skipped.push({ row: r, reason: `State ${state.code} is outside your command scope.` });
      continue;
    }

    let lgaId: string | null = null;
    if (parsed.data.lgaName) {
      const lga = await prisma.lGA.findFirst({
        where: { stateId: state.id, name: { equals: parsed.data.lgaName, mode: "insensitive" } },
      });
      lgaId = lga?.id ?? null;
    }

    seenServiceNos.add(parsed.data.serviceNo);
    toCreate.push({
      serviceNo: parsed.data.serviceNo,
      name: parsed.data.name,
      rank: parsed.data.rank,
      gender: parsed.data.gender || null,
      phone: parsed.data.phone || null,
      stateId: state.id,
      lgaId,
    });
  }

  if (toCreate.length === 0) {
    return {
      message: "No valid rows to import.",
      skipped: skipped.slice(0, 20),
    };
  }

  const existingServiceNos = await prisma.officer.findMany({
    where: { serviceNo: { in: toCreate.map((o) => o.serviceNo) } },
    select: { serviceNo: true },
  });
  const existingSet = new Set(existingServiceNos.map((o) => o.serviceNo));
  const finalRows = toCreate.filter((o) => {
    if (existingSet.has(o.serviceNo)) {
      skipped.push({ row: 0, reason: `Already exists: ${o.serviceNo}` });
      return false;
    }
    return true;
  });

  const batch = await prisma.importBatch.create({
    data: {
      filename: file.name,
      uploadedBy: session.user.id,
      recordCount: finalRows.length,
      status: finalRows.length > 0 ? "COMPLETED" : "EMPTY",
    },
  });

  if (finalRows.length > 0) {
    await prisma.officer.createMany({
      data: finalRows.map((r) => ({ ...r, importBatch: batch.id })),
    });
  }

  revalidatePath("/personnel");
  return {
    success: true,
    imported: finalRows.length,
    skipped: skipped.slice(0, 20),
  };
}
