import type { Metadata } from "next";
import { Users, MapPinned, ClipboardList, ShieldAlert } from "lucide-react";
import { verifySession, personnelScopeWhere, pollingUnitScopeWhere } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Dashboard — ESDMS",
};

const ROLE_SCOPE_LABEL: Record<string, string> = {
  IGP: "All 36 states + FCT",
  AIG: "Your zone",
  CP: "Your state",
  DPO: "Your LGA",
  SPO: "Your assignment",
};

export default async function DashboardPage() {
  const session = await verifySession();
  const { user } = session;
  const scope = {
    role: user.role,
    zoneId: user.zoneId,
    serviceNo: user.serviceNo,
    stateId: user.stateId,
    lgaId: user.lgaId,
  };

  const [personnelWhere, pollingUnitWhere] = await Promise.all([
    personnelScopeWhere(scope),
    pollingUnitScopeWhere(scope),
  ]);

  const [officerCount, pollingUnitCount, pendingAssignments, deployedAssignments] =
    await Promise.all([
      prisma.officer.count({ where: personnelWhere }),
      prisma.pollingUnit.count({ where: pollingUnitWhere }),
      prisma.assignment.count({
        where: { status: "PENDING", officer: personnelWhere },
      }),
      prisma.assignment.count({
        where: { status: "DEPLOYED", officer: personnelWhere },
      }),
    ]);

  const tiles = [
    { label: "Officers", value: officerCount, icon: Users },
    { label: "Polling Units", value: pollingUnitCount, icon: MapPinned },
    { label: "Pending Assignments", value: pendingAssignments, icon: ClipboardList },
    { label: "Deployed", value: deployedAssignments, icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Welcome, {user.name}
          </h1>
          <Badge variant="secondary">{user.role}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing data for: {ROLE_SCOPE_LABEL[user.role]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardDescription>{tile.label}</CardDescription>
              <tile.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold text-primary">
                {tile.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Personnel and polling unit data haven&apos;t been imported yet.
            Head to the Personnel and Polling Units sections to upload data
            before allocating duties.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
