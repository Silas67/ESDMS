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

export type OfficerRow = {
  id: string;
  serviceNo: string;
  name: string;
  rank: string;
  gender: string | null;
  phone: string | null;
  stateName: string;
  lgaName: string;
};

const columns: ColumnDef<OfficerRow>[] = [
  { accessorKey: "serviceNo", header: "Service No." },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "rank", header: "Rank" },
  { accessorKey: "gender", header: "Gender", cell: (c) => c.getValue() || "—" },
  { accessorKey: "stateName", header: "State" },
  { accessorKey: "lgaName", header: "LGA" },
  { accessorKey: "phone", header: "Phone", cell: (c) => c.getValue() || "—" },
];

export function OfficersTable({ rows }: { rows: OfficerRow[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                No officers found.
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
