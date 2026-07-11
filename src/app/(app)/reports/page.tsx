import type { Metadata } from "next";
import Link from "next/link";
import { Users, MapPinned, ShieldCheck, ClipboardList } from "lucide-react";
import { verifySession } from "@/lib/dal";
import {
  getCoverageSummary,
  getCoverageBreakdown,
  getCoverageGaps,
} from "@/lib/data/reports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CoverageBreakdownTable } from "@/components/reports/coverage-breakdown-table";
import { CoverageGapsTable } from "@/components/reports/coverage-gaps-table";
import { OsunElectionSection } from "@/components/reports/osun-election-section";
import { getOsunElectionReadiness } from "@/lib/data/osun-election";

export const metadata: Metadata = {
  title: "Reports — ESDMS",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await verifySession();
  const { user } = session;
  const scope = {
    role: user.role,
    zoneId: user.zoneId,
    stateId: user.stateId,
    lgaId: user.lgaId,
    serviceNo: user.serviceNo,
  };

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [summary, breakdown, gaps, osunReadiness] = await Promise.all([
    getCoverageSummary(scope),
    getCoverageBreakdown(scope),
    getCoverageGaps({ scope, page, q }),
    getOsunElectionReadiness(),
  ]);

  const showOsunSection =
    !!osunReadiness &&
    (user.role === "IGP" ||
      (user.role === "AIG" && user.zoneId === osunReadiness.zoneId) ||
      (user.role === "CP" && user.stateId === osunReadiness.stateId));

  const groupLabel = user.role === "IGP" || user.role === "AIG" ? "State" : "LGA";
  const totalGapPages = Math.max(1, Math.ceil(gaps.total / gaps.pageSize));

  const tiles = [
    { label: "Officers", value: summary.totalOfficers, icon: Users },
    { label: "Polling units", value: summary.totalPollingUnits, icon: MapPinned },
    { label: "Coverage", value: `${summary.coveragePercent}%`, icon: ShieldCheck },
    { label: "Deployed", value: summary.byStatus.deployed, icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Deployment coverage across your command scope
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
              <p className="font-heading text-3xl font-semibold text-primary">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showOsunSection && osunReadiness && <OsunElectionSection data={osunReadiness} />}

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Coverage by {groupLabel === "State" ? "state" : "LGA"}
        </h2>
        <CoverageBreakdownTable rows={breakdown} groupLabel={groupLabel} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Coverage gaps ({gaps.total.toLocaleString()})
          </h2>
          <form className="max-w-sm">
            <Input name="q" defaultValue={q} placeholder="Search polling units..." />
          </form>
        </div>
        <CoverageGapsTable rows={gaps.rows} />

        {totalGapPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalGapPages}
            </span>
            <div className="flex gap-2">
              {page <= 1 ? (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/reports?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    />
                  }
                >
                  Previous
                </Button>
              )}
              {page >= totalGapPages ? (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/reports?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    />
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
