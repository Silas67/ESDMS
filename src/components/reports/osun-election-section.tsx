import { Users, MapPinned, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { CoverageBreakdownTable } from "@/components/reports/coverage-breakdown-table";
import type { OsunElectionReadiness } from "@/lib/data/osun-election";

export function OsunElectionSection({ data }: { data: OsunElectionReadiness }) {
  const tiles = [
    { label: "Officers in Osun", value: data.totalOfficers, icon: Users },
    { label: "Polling units", value: data.totalPollingUnits, icon: MapPinned },
    { label: "Coverage", value: `${data.coveragePercent}%`, icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-accent/40 bg-accent/5 p-4 sm:p-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-primary">
          Osun State — Governorship Election Readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          August 15, 2026 · the last statewide election before the general election
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold text-primary">
          Coverage by senatorial district
        </h3>
        <CoverageBreakdownTable rows={data.districts} groupLabel="Senatorial District" />
      </div>

      {data.lgasByDistrict.map(({ district, lgas }) => (
        <div key={district} className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold text-primary">
            {district} — {lgas.length} LGAs
          </h3>
          <CoverageBreakdownTable rows={lgas} groupLabel="LGA" />
        </div>
      ))}
    </div>
  );
}
