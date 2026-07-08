"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DutyCardRow = {
  id: string;
  status: string;
  role: string | null;
  officerName: string;
  officerServiceNo: string;
  pollingUnitName: string;
  pollingUnitCode: string;
  lgaName: string;
  stateName: string;
  generatedAt: string | null;
};

const columns: ColumnDef<DutyCardRow>[] = [
  {
    id: "officer",
    header: "Officer",
    cell: (c) => (
      <div>
        <p className="font-medium">{c.row.original.officerName}</p>
        <p className="text-xs text-muted-foreground">{c.row.original.officerServiceNo}</p>
      </div>
    ),
  },
  {
    id: "pollingUnit",
    header: "Polling Unit",
    cell: (c) => (
      <div>
        <p>{c.row.original.pollingUnitName}</p>
        <p className="text-xs text-muted-foreground">
          {c.row.original.pollingUnitCode} · {c.row.original.lgaName}, {c.row.original.stateName}
        </p>
      </div>
    ),
  },
  { accessorKey: "role", header: "Role", cell: (c) => c.getValue() || "—" },
  {
    accessorKey: "status",
    header: "Status",
    cell: (c) => <Badge variant={c.getValue() === "DEPLOYED" ? "default" : "secondary"}>{c.getValue() as string}</Badge>,
  },
  {
    id: "card",
    header: "Duty card",
    cell: (c) =>
      c.row.original.generatedAt ? (
        <span className="text-xs text-muted-foreground">
          Generated {new Date(c.row.original.generatedAt).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Not generated yet</span>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: (c) => (
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<a href={`/api/duty-cards/${c.row.original.id}/pdf`} download />}
      >
        <Download />
        {c.row.original.generatedAt ? "Re-download" : "Generate PDF"}
      </Button>
    ),
  },
];

export function DutyCardsTable({ rows }: { rows: DutyCardRow[] }) {
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No confirmed assignments yet. Duty cards can be generated once an officer&apos;s
                allocation is confirmed.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
