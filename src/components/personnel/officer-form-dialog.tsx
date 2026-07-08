"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createOfficer, getLgasForStateAction } from "@/lib/actions/officers";
import { CreateOfficerSchema, type CreateOfficerInput } from "@/lib/validations/officer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type StateOption = { id: string; name: string; code: string };

export function OfficerFormDialog({
  states,
  fixedLocation,
}: {
  states: StateOption[];
  fixedLocation: { stateName: string; lgaName: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lgas, setLgas] = useState<{ id: string; name: string }[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateOfficerInput>({
    resolver: zodResolver(CreateOfficerSchema),
    defaultValues: { stateId: states.length === 1 ? states[0].id : "" },
  });

  const selectedStateId = watch("stateId");
  const selectedLgaId = watch("lgaId");
  const stateItems = Object.fromEntries(states.map((s) => [s.id, s.name]));
  const lgaItems = Object.fromEntries(lgas.map((l) => [l.id, l.name]));

  async function onStateChange(stateId: string | null) {
    setValue("stateId", stateId ?? "");
    setValue("lgaId", "");
    setLgas(stateId ? await getLgasForStateAction(stateId) : []);
  }

  function onSubmit(data: CreateOfficerInput) {
    startTransition(async () => {
      const result = await createOfficer(data);
      if (result?.success) {
        toast.success("Officer added.");
        reset();
        setLgas([]);
        setOpen(false);
      } else if (result?.message) {
        toast.error(result.message);
      } else if (result?.errors) {
        toast.error("Check the highlighted fields.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        Add Officer
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add officer</DialogTitle>
          <DialogDescription>
            {fixedLocation
              ? `New officers are assigned to ${fixedLocation.lgaName ?? fixedLocation.stateName}.`
              : "Add a single officer record to the personnel roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="serviceNo">Service number</Label>
              <Input id="serviceNo" {...register("serviceNo")} />
              {errors.serviceNo && (
                <p className="text-xs text-destructive">{errors.serviceNo.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rank">Rank</Label>
              <Input id="rank" {...register("rank")} />
              {errors.rank && <p className="text-xs text-destructive">{errors.rank.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(v) => setValue("gender", v as "Male" | "Female")}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          {!fixedLocation && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="stateId">State</Label>
                <Select
                  items={stateItems}
                  value={selectedStateId}
                  onValueChange={onStateChange}
                >
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
                {errors.stateId && (
                  <p className="text-xs text-destructive">{errors.stateId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lgaId">LGA (optional)</Label>
                <Select
                  items={lgaItems}
                  value={selectedLgaId}
                  disabled={!selectedStateId || lgas.length === 0}
                  onValueChange={(v) => setValue("lgaId", (v ?? "") as string)}
                >
                  <SelectTrigger id="lgaId" className="w-full">
                    <SelectValue
                      placeholder={
                        !selectedStateId
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
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Adding..." : "Add officer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
