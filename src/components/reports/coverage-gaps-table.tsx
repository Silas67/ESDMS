import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CoverageGapRow = {
  id: string;
  name: string;
  inecCode: string;
  ward: string | null;
  lgaName: string;
  stateName: string;
};

export function CoverageGapsTable({ rows }: { rows: CoverageGapRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Polling unit</TableHead>
            <TableHead>INEC Code</TableHead>
            <TableHead>Ward</TableHead>
            <TableHead>LGA</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No coverage gaps — every polling unit in your scope has at least one active
                assignment.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.inecCode}</TableCell>
                <TableCell>{row.ward ?? "—"}</TableCell>
                <TableCell>{row.lgaName}</TableCell>
                <TableCell>{row.stateName}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
