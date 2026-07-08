"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { suspendUser, reinstateUser } from "@/lib/actions/admin";
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
import type { Role } from "@/generated/prisma/enums";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  rank: string | null;
  serviceNo: string | null;
  suspended: boolean;
  stateName: string | null;
  lgaName: string | null;
  zoneName: string | null;
};

function ScopeCell({ row }: { row: UserRow }) {
  const scope = row.lgaName ?? row.stateName ?? row.zoneName;
  return <span>{scope ?? "—"}</span>;
}

function ActionsCell({ row, currentUserId }: { row: UserRow; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const isSelf = row.id === currentUserId;

  function onReinstate() {
    startTransition(async () => {
      await reinstateUser(row.id);
      toast.success(`${row.name} reinstated.`);
    });
  }

  function onSuspend() {
    startTransition(async () => {
      await suspendUser(row.id);
      toast.success(`${row.name} suspended.`);
    });
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  if (row.suspended) {
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={onReinstate}>
        Reinstate
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" disabled={pending} />}>
        Suspend
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend {row.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will be signed out and unable to log back in until reinstated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
          <AlertDialogAction render={<Button variant="destructive" />} onClick={onSuspend}>
            Suspend
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UsersTable({ rows, currentUserId }: { rows: UserRow[]; currentUserId: string }) {
  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: (c) => <Badge variant="secondary">{c.getValue() as string}</Badge> },
    { accessorKey: "rank", header: "Rank", cell: (c) => c.getValue() || "—" },
    { id: "scope", header: "Scope", cell: (c) => <ScopeCell row={c.row.original} /> },
    {
      id: "status",
      header: "Status",
      cell: (c) =>
        c.row.original.suspended ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (c) => <ActionsCell row={c.row.original} currentUserId={currentUserId} />,
    },
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
                No users found.
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
