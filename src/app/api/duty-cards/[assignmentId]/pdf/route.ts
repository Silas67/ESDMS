import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { personnelScopeWhere, type Scope } from "@/lib/dal";
import { generateDutyCardPdf } from "@/lib/pdf/duty-card";

const ELIGIBLE_STATUSES = ["CONFIRMED", "DEPLOYED"];

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/duty-cards/[assignmentId]/pdf">
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { assignmentId } = await ctx.params;
  const scope: Scope = {
    role: session.user.role,
    zoneId: session.user.zoneId,
    stateId: session.user.stateId,
    lgaId: session.user.lgaId,
    serviceNo: session.user.serviceNo,
  };

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, officer: await personnelScopeWhere(scope) },
    include: {
      officer: true,
      pollingUnit: { include: { lga: { include: { state: true } } } },
    },
  });

  if (!assignment) {
    return new Response("Duty card not found in your command scope.", { status: 404 });
  }
  if (!ELIGIBLE_STATUSES.includes(assignment.status)) {
    return new Response("This assignment is not confirmed yet.", { status: 409 });
  }

  await prisma.dutyCard.upsert({
    where: { assignmentId: assignment.id },
    update: {},
    create: { assignmentId: assignment.id },
  });

  const pdf = await generateDutyCardPdf({
    assignmentId: assignment.id,
    officerName: assignment.officer.name,
    officerRank: assignment.officer.rank,
    officerServiceNo: assignment.officer.serviceNo,
    dutyRole: assignment.role,
    status: assignment.status,
    pollingUnitName: assignment.pollingUnit.name,
    pollingUnitCode: assignment.pollingUnit.inecCode,
    ward: assignment.pollingUnit.ward,
    lgaName: assignment.pollingUnit.lga.name,
    stateName: assignment.pollingUnit.lga.state.name,
    generatedAt: new Date(),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="duty-card-${assignment.officer.serviceNo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
