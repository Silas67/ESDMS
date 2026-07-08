"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { verifySession, type Scope } from "@/lib/dal";
import { ImportPollingUnitRowSchema } from "@/lib/validations/polling-unit";

const MANAGER_ROLES = ["IGP", "AIG", "CP", "DPO"] as const;

function assertCanManage(scope: Scope) {
  if (!MANAGER_ROLES.includes(scope.role as (typeof MANAGER_ROLES)[number])) {
    throw new Error("FORBIDDEN");
  }
}

export type ImportPollingUnitsState = {
  message?: string;
  success?: boolean;
  imported?: number;
  skipped?: { row: number; reason: string }[];
} | undefined;

const MAX_IMPORT_ROWS = 20000;

export async function importPollingUnits(
  _state: ImportPollingUnitsState,
  formData: FormData
): Promise<ImportPollingUnitsState> {
  const session = await verifySession();
  const scope: Scope = {
    role: session.user.role,
    zoneId: session.user.zoneId,
    serviceNo: session.user.serviceNo,
    stateId: session.user.stateId,
    lgaId: session.user.lgaId,
  };
  assertCanManage(scope);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose an Excel file to import." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { message: "File is too large (max 8MB)." };
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
    inecCode: colIndex("ineccode"),
    name: colIndex("name"),
    stateCode: colIndex("statecode"),
    lga: colIndex("lga"),
    ward: colIndex("ward"),
    address: colIndex("address"),
    capacity: colIndex("capacity"),
  };

  if (cols.inecCode === -1 || cols.name === -1 || cols.stateCode === -1 || cols.lga === -1) {
    return {
      message:
        "Missing required columns. Expected headers: inecCode, name, stateCode, lga, and optionally ward, address, capacity.",
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
    return { message: `Too many rows. Max ${MAX_IMPORT_ROWS} polling units per import.` };
  }

  // DPO is locked to their own single LGA; every row must resolve there regardless
  // of what the file says, matching the "never trust client-scoped input" rule
  // used for officer imports.
  let lockedLga: { id: string; stateId: string } | null = null;
  if (scope.role === "DPO") {
    if (!scope.stateId || !scope.lgaId) return { message: "Your account has no LGA assigned yet." };
    lockedLga = { id: scope.lgaId, stateId: scope.stateId };
  }

  const lgaCache = new Map<string, string>(); // `${stateId}|${nameLower}` -> lgaId

  async function resolveLga(stateId: string, name: string): Promise<string> {
    const key = `${stateId}|${name.toLowerCase()}`;
    const cached = lgaCache.get(key);
    if (cached) return cached;

    const existing = await prisma.lGA.findFirst({
      where: { stateId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      lgaCache.set(key, existing.id);
      return existing.id;
    }

    const created = await prisma.lGA.create({ data: { name, stateId } });
    lgaCache.set(key, created.id);
    return created.id;
  }

  const toCreate: {
    inecCode: string;
    name: string;
    lgaId: string;
    ward: string | null;
    address: string | null;
    capacity: number | null;
  }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seenCodes = new Set<string>();

  for (let r = 2; r <= rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw = {
      inecCode: String(row.getCell(cols.inecCode).value ?? "").trim(),
      name: String(row.getCell(cols.name).value ?? "").trim(),
      stateCode: String(row.getCell(cols.stateCode).value ?? "").trim(),
      lgaName: String(row.getCell(cols.lga).value ?? "").trim(),
      ward: cols.ward !== -1 ? String(row.getCell(cols.ward).value ?? "").trim() : "",
      address: cols.address !== -1 ? String(row.getCell(cols.address).value ?? "").trim() : "",
      capacity: cols.capacity !== -1 ? String(row.getCell(cols.capacity).value ?? "").trim() : "",
    };

    if (!raw.inecCode && !raw.name) continue;

    const parsed = ImportPollingUnitRowSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push({ row: r, reason: "Missing required fields (inecCode, name, stateCode, lga)." });
      continue;
    }

    if (seenCodes.has(parsed.data.inecCode)) {
      skipped.push({ row: r, reason: `Duplicate inecCode in file: ${parsed.data.inecCode}` });
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
    if (lockedLga && state.id !== lockedLga.stateId) {
      skipped.push({ row: r, reason: `State ${state.code} does not match your assigned LGA.` });
      continue;
    }

    const capacity = parsed.data.capacity ? Number.parseInt(parsed.data.capacity, 10) : null;

    const lgaId = lockedLga ? lockedLga.id : await resolveLga(state.id, parsed.data.lgaName);

    seenCodes.add(parsed.data.inecCode);
    toCreate.push({
      inecCode: parsed.data.inecCode,
      name: parsed.data.name,
      lgaId,
      ward: parsed.data.ward || null,
      address: parsed.data.address || null,
      capacity: Number.isFinite(capacity) ? capacity : null,
    });
  }

  if (toCreate.length === 0) {
    return { message: "No valid rows to import.", skipped: skipped.slice(0, 20) };
  }

  const existingCodes = await prisma.pollingUnit.findMany({
    where: { inecCode: { in: toCreate.map((r) => r.inecCode) } },
    select: { inecCode: true },
  });
  const existingSet = new Set(existingCodes.map((p) => p.inecCode));
  const finalRows = toCreate.filter((r) => {
    if (existingSet.has(r.inecCode)) {
      skipped.push({ row: 0, reason: `Already exists: ${r.inecCode}` });
      return false;
    }
    return true;
  });

  await prisma.importBatch.create({
    data: {
      filename: file.name,
      uploadedBy: session.user.id,
      recordCount: finalRows.length,
      status: finalRows.length > 0 ? "COMPLETED" : "EMPTY",
    },
  });

  if (finalRows.length > 0) {
    await prisma.pollingUnit.createMany({ data: finalRows });
  }

  revalidatePath("/polling-units");
  revalidatePath("/dashboard");
  return { success: true, imported: finalRows.length, skipped: skipped.slice(0, 20) };
}
