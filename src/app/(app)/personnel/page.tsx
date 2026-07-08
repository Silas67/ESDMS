import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getOfficersPage, getStatesInScope, getLgaName } from "@/lib/data/officers";
import { OfficersTable } from "@/components/personnel/officers-table";
import { OfficerFormDialog } from "@/components/personnel/officer-form-dialog";
import { OfficerImportDialog } from "@/components/personnel/officer-import-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Personnel — ESDMS",
};

const MANAGER_ROLES = new Set(["IGP", "AIG", "CP", "DPO"]);

export default async function PersonnelPage({
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

  const [{ rows, total, pageSize }, states] = await Promise.all([
    getOfficersPage({ scope, page, q }),
    getStatesInScope(scope),
  ]);

  const canManage = MANAGER_ROLES.has(user.role);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fixedLocation =
    user.role === "CP" || user.role === "DPO"
      ? {
          stateName: states[0]?.name ?? "your state",
          lgaName: user.role === "DPO" && user.lgaId ? await getLgaName(user.lgaId) : "",
        }
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Personnel</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} officer{total === 1 ? "" : "s"} in your scope
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <OfficerImportDialog />
            <OfficerFormDialog states={states} fixedLocation={fixedLocation} />
          </div>
        )}
      </div>

      <form className="max-w-sm">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name or service number..."
        />
      </form>

      <OfficersTable rows={rows} />

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
                    href={`/personnel?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
                    href={`/personnel?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
