import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getDutyCardEligibleAssignments } from "@/lib/data/duty-cards";
import { DutyCardsTable } from "@/components/duty-cards/duty-cards-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Duty Cards — ESDMS",
};

export default async function DutyCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await verifySession();
  const { user } = session;
  const scope = {
    role: user.role,
    zoneId: user.zoneId,
    stateId: user.stateId,
    lgaId: user.lgaId,
    serviceNo: user.serviceNo,
  };

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { rows, total, pageSize } = await getDutyCardEligibleAssignments({ scope, page, q });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Duty Cards</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} confirmed assignment{total === 1 ? "" : "s"} eligible for a
          duty card
        </p>
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Search by officer or polling unit..." />
      </form>

      <DutyCardsTable
        rows={rows.map((r) => ({
          ...r,
          generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
        }))}
      />

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
                    href={`/duty-cards?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
                    href={`/duty-cards?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
