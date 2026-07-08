"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { approveUser, type ApproveUserState } from "@/lib/actions/admin";
import { getLgasForStateAction } from "@/lib/actions/officers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from "@/generated/prisma/enums";

type PendingUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  rank: string | null;
  serviceNo: string | null;
};

const ROLE_LABEL: Record<Role, string> = {
  IGP: "IGP / National command",
  AIG: "AIG / Zonal command",
  CP: "CP / State command",
  DPO: "DPO / LGA command",
  SPO: "SPO / Field officer",
};

export function ApproveUserDialog({
  user,
  zones,
  states,
}: {
  user: PendingUser;
  zones: { id: string; name: string }[];
  states: { id: string; name: string; zoneId: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [stateId, setStateId] = useState<string | null>(null);
  const [lgas, setLgas] = useState<{ id: string; name: string }[]>([]);
  const [lgaId, setLgaId] = useState<string | null>(null);

  const [state, action, pending] = useActionState(async (
    prev: ApproveUserState,
    formData: FormData
  ) => {
    const result = await approveUser(prev, formData);
    if (result?.success) {
      toast.success(`${user.name} approved.`);
      setOpen(false);
    } else if (result?.message) {
      toast.error(result.message);
    }
    return result;
  }, undefined);

  const zoneItems = Object.fromEntries(zones.map((z) => [z.id, z.name]));
  const stateItems = Object.fromEntries(states.map((s) => [s.id, s.name]));
  const lgaItems = Object.fromEntries(lgas.map((l) => [l.id, l.name]));

  async function onStateSelect(id: string | null) {
    setStateId(id);
    setLgaId(null);
    setLgas(id ? await getLgasForStateAction(id) : []);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Approve</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve {user.name}</DialogTitle>
          <DialogDescription>
            {ROLE_LABEL[user.role]} · {user.rank ?? "—"} · {user.serviceNo ?? "no service no."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          {user.role === "AIG" && (
            <div className="space-y-1.5">
              <Label htmlFor="zoneId">Zone</Label>
              <Select items={zoneItems} value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger id="zoneId" className="w-full">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="zoneId" value={zoneId ?? ""} />
            </div>
          )}

          {(user.role === "CP" || user.role === "DPO") && (
            <div className="space-y-1.5">
              <Label htmlFor="stateId">State</Label>
              <Select items={stateItems} value={stateId} onValueChange={onStateSelect}>
                <SelectTrigger id="stateId" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="stateId" value={stateId ?? ""} />
            </div>
          )}

          {user.role === "DPO" && (
            <div className="space-y-1.5">
              <Label htmlFor="lgaId">LGA</Label>
              <Select
                items={lgaItems}
                value={lgaId}
                onValueChange={setLgaId}
                disabled={!stateId}
              >
                <SelectTrigger id="lgaId" className="w-full">
                  <SelectValue
                    placeholder={
                      !stateId
                        ? "Select a state first"
                        : lgas.length === 0
                          ? "No LGAs yet for this state"
                          : "Select LGA"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {lgas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="lgaId" value={lgaId ?? ""} />
            </div>
          )}

          {(user.role === "IGP" || user.role === "SPO") && (
            <p className="text-sm text-muted-foreground">
              No command scope needed for this role.
            </p>
          )}

          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Approving..." : "Approve account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
