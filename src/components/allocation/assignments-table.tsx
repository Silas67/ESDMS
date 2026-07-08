"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { updateAssignmentStatus, deleteAssignment } from "@/lib/actions/allocations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AssignmentStatus } from "@/generated/prisma/enums";

export type AssignmentRow = {
  id: string;
  role: string | null;
  status: AssignmentStatus;
  officerName: string;
  officerServiceNo: string;
  pollingUnitName: string;
  pollingUnitCode: string;
  lgaName: string;
  stateName: string;
};

const STATUS_VARIANT: Record<AssignmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  CONFIRMED: "secondary",
  DEPLOYED: "default",
  ABSENT: "destructive",
};

const STATUS_OPTIONS: AssignmentStatus[] = ["PENDING", "CONFIRMED", "DEPLOYED", "ABSENT"];

function ActionsCell({ row }: { row: AssignmentRow }) {
  const [pending, startTransition] = useTransition();

  function onStatusChange(status: string | null) {
    if (!status) return;
    startTransition(async () => {
      try {
        await updateAssignmentStatus(row.id, status as AssignmentStatus);
        toast.success(`${row.officerName} marked ${status.toLowerCase()}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update status.");
      }
    });
  }

  function onUnassign() {
    startTransition(async () => {
      try {
        await deleteAssignment(row.id);
        toast.success(`${row.officerName} unassigned.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not unassign.");
      }
    });
  }

  const statusItems = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, s]));

  return (
    <div className="flex items-center gap-2">
      <Select
        items={statusItems}
        value={row.status}
        onValueChange={onStatusChange}
        disabled={pending}
      >
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="outline" disabled={pending} />}>
          Unassign
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign {row.officerName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes this duty assignment. {row.officerName} will become available for a new
              allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
            <AlertDialogAction render={<Button variant="destructive" />} onClick={onUnassign}>
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AssignmentsTable({ rows }: { rows: AssignmentRow[] }) {
  const columns: ColumnDef<AssignmentRow>[] = [
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
      id: "status",
      header: "Status",
      cell: (c) => <Badge variant={STATUS_VARIANT[c.row.original.status]}>{c.row.original.status}</Badge>,
    },
    { id: "actions", header: "", cell: (c) => <ActionsCell row={c.row.original} /> },
  ];

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
                No assignments found.
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
