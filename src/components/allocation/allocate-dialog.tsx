"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { ClipboardPlus } from "lucide-react";
import { createAssignment } from "@/lib/actions/allocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Officer = { id: string; name: string; serviceNo: string; rank: string };
type PollingUnit = {
  id: string;
  name: string;
  inecCode: string;
  capacity: number | null;
  assignedCount: number;
};

export function AllocateDialog({
  officers,
  pollingUnits,
}: {
  officers: Officer[];
  pollingUnits: PollingUnit[];
}) {
  type ComboItem = { value: string; label: string };

  const [open, setOpen] = useState(false);
  const [officerItem, setOfficerItem] = useState<ComboItem | null>(null);
  const [pollingUnitItem, setPollingUnitItem] = useState<ComboItem | null>(null);

  const [state, action, pending] = useActionState(async (
    prev: Awaited<ReturnType<typeof createAssignment>>,
    formData: FormData
  ) => {
    const result = await createAssignment(prev, formData);
    if (result?.success) {
      toast.success("Officer allocated.");
      setOfficerItem(null);
      setPollingUnitItem(null);
      setOpen(false);
    } else if (result?.message) {
      toast.error(result.message);
    }
    return result;
  }, undefined);

  const officerItems = officers.map((o) => ({
    value: o.id,
    label: `${o.name} — ${o.serviceNo} (${o.rank})`,
  }));
  const puItems = pollingUnits.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.inecCode})${p.capacity ? ` · ${p.assignedCount}/${p.capacity}` : ""}`,
  }));

  const filterByLabel = (item: ComboItem, query: string) =>
    item.label.toLowerCase().includes(query.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <ClipboardPlus />
        Allocate Officer
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate officer to duty</DialogTitle>
          <DialogDescription>
            Assign an unassigned officer in your scope to a polling unit.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Officer</Label>
            <Combobox
              items={officerItems}
              value={officerItem}
              onValueChange={(v) => setOfficerItem(v as ComboItem | null)}
              filter={filterByLabel}
            >
              <ComboboxInput placeholder="Search officer by name or service no..." />
              <ComboboxContent>
                <ComboboxList>
                  {(item: ComboItem) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>No unassigned officers found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            <input type="hidden" name="officerId" value={officerItem?.value ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label>Polling unit</Label>
            <Combobox
              items={puItems}
              value={pollingUnitItem}
              onValueChange={(v) => setPollingUnitItem(v as ComboItem | null)}
              filter={filterByLabel}
            >
              <ComboboxInput placeholder="Search polling unit by name or INEC code..." />
              <ComboboxContent>
                <ComboboxList>
                  {(item: ComboItem) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>No polling units found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            <input type="hidden" name="pollingUnitId" value={pollingUnitItem?.value ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Duty role (optional)</Label>
            <Input id="role" name="role" placeholder="e.g. Team Lead, Security Officer" />
          </div>

          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
