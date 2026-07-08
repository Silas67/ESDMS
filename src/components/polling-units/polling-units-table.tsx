"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PollingUnitRow = {
  id: string;
  inecCode: string;
  name: string;
  ward: string | null;
  address: string | null;
  capacity: number | null;
  lgaName: string;
  stateName: string;
};

const columns: ColumnDef<PollingUnitRow>[] = [
  { accessorKey: "inecCode", header: "INEC Code" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "ward", header: "Ward", cell: (c) => c.getValue() || "—" },
  { accessorKey: "lgaName", header: "LGA" },
  { accessorKey: "stateName", header: "State" },
  { accessorKey: "capacity", header: "Capacity", cell: (c) => c.getValue() ?? "—" },
];

export function PollingUnitsTable({ rows }: { rows: PollingUnitRow[] }) {
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
                No polling units found.
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
