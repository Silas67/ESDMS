"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { rejectUser } from "@/lib/actions/admin";
import { ApproveUserDialog } from "@/components/admin/approve-user-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type PendingUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  rank: string | null;
  serviceNo: string | null;
};

export function PendingUsersList({
  users,
  zones,
  states,
}: {
  users: PendingUser[];
  zones: { id: string; name: string }[];
  states: { id: string; name: string; zoneId: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function onReject(id: string, name: string) {
    startTransition(async () => {
      try {
        await rejectUser(id);
        toast.success(`Rejected ${name}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not reject account.");
      }
    });
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>No accounts are waiting for approval.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending approvals</CardTitle>
        <CardDescription>
          {users.length} account{users.length === 1 ? "" : "s"} waiting for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.name}</p>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {user.email} · {user.rank ?? "—"} · {user.serviceNo ?? "no service no."}
              </p>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="outline" disabled={pending} />}>
                  Reject
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject {user.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes their pending account request. They can register
                      again if this was a mistake.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      render={<Button variant="destructive" />}
                      onClick={() => onReject(user.id, user.name)}
                    >
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ApproveUserDialog user={user} zones={zones} states={states} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
