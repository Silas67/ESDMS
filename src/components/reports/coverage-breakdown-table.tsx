import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CoverageMeter } from "@/components/reports/coverage-meter";
import type { CoverageBreakdownRow } from "@/lib/data/reports";

export function CoverageBreakdownTable({
  rows,
  groupLabel,
}: {
  rows: CoverageBreakdownRow[];
  groupLabel: string;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{groupLabel}</TableHead>
            <TableHead>Polling units</TableHead>
            <TableHead>Covered</TableHead>
            <TableHead>Coverage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No polling unit data yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="tabular-nums">{row.totalPollingUnits}</TableCell>
                <TableCell className="tabular-nums">{row.coveredPollingUnits}</TableCell>
                <TableCell>
                  <CoverageMeter percent={row.coveragePercent} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
