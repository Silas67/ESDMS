import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getPollingUnitsPage } from "@/lib/data/polling-units";
import { PollingUnitsTable } from "@/components/polling-units/polling-units-table";
import { PollingUnitImportDialog } from "@/components/polling-units/polling-unit-import-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Polling Units — ESDMS",
};

const MANAGER_ROLES = new Set(["IGP", "AIG", "CP", "DPO"]);

export default async function PollingUnitsPage({
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

  const { rows, total, pageSize } = await getPollingUnitsPage({ scope, page, q });
  const canManage = MANAGER_ROLES.has(user.role);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Polling Units</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} polling unit{total === 1 ? "" : "s"} in your scope
          </p>
        </div>
        {canManage && <PollingUnitImportDialog />}
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Search by name, INEC code, or ward..." />
      </form>

      <PollingUnitsTable rows={rows} />

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
                render={
                  <Link
                    href={`/polling-units?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
                render={
                  <Link
                    href={`/polling-units?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
