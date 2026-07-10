import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import {
  getAssignmentsPage,
  getUnassignedOfficers,
  getPollingUnitsForAllocation,
} from "@/lib/data/allocations";
import { AssignmentsTable } from "@/components/allocation/assignments-table";
import { AllocateDialog } from "@/components/allocation/allocate-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Allocation — ESDMS",
};

const MANAGER_ROLES = new Set(["IGP", "AIG", "CP", "DPO"]);

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await verifySession();
  const { user } = session;
  const scope = {
    role: user.role,
    zoneId: user.zoneId,
    serviceNo: user.serviceNo,
    stateId: user.stateId,
    lgaId: user.lgaId,
  };

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const canManage = MANAGER_ROLES.has(user.role);

  const [{ rows, total, pageSize }, officers, pollingUnits] = await Promise.all([
    getAssignmentsPage({ scope, page, q }),
    canManage ? getUnassignedOfficers(scope) : Promise.resolve([]),
    canManage ? getPollingUnitsForAllocation(scope) : Promise.resolve([]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Allocation</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} assignment{total === 1 ? "" : "s"} in your scope
          </p>
        </div>
        {canManage && <AllocateDialog officers={officers} pollingUnits={pollingUnits} />}
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Search by officer or polling unit..." />
      </form>

      <AssignmentsTable rows={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/allocation?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  />
                }
              >
                Previous
              </Button>
            )}
            {page >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/allocation?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  />
                }
              >
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
