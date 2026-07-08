"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { importOfficers } from "@/lib/actions/officers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function OfficerImportDialog() {
  const [state, action, pending] = useActionState(importOfficers, undefined);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload />
        Import Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import personnel from Excel</DialogTitle>
          <DialogDescription>
            .xlsx file with header row: <code>serviceNo, name, rank, stateCode</code>,
            optionally <code>gender, phone, lga</code>. State codes must match the two-letter
            state codes used in this system (e.g. LA for Lagos).
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file">Excel file</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx"
              required
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
            />
          </div>

          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}

          {state?.success && (
            <p className="rounded-md bg-secondary/10 px-3 py-2 text-sm text-secondary">
              Imported {state.imported} officer{state.imported === 1 ? "" : "s"}.
            </p>
          )}

          {state?.skipped && state.skipped.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-xs text-muted-foreground">
              {state.skipped.map((s, i) => (
                <p key={i}>
                  {s.row > 0 ? `Row ${s.row}: ` : ""}
                  {s.reason}
                </p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
