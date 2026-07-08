import type { Metadata } from "next";
import { verifySession, assertRole } from "@/lib/dal";
import { getPendingUsers, getUsersPage, getZones, getAllStates } from "@/lib/data/users";
import { PendingUsersList } from "@/components/admin/pending-users-list";
import { UsersTable } from "@/components/admin/users-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin — ESDMS",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await verifySession();
  assertRole(session.user.role, ["IGP"]);

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [pendingUsers, { rows, total, pageSize }, zones, states] = await Promise.all([
    getPendingUsers(),
    getUsersPage({ page, q }),
    getZones(),
    getAllStates(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Approve pending accounts, assign command scope, and manage user access.
        </p>
      </div>

      <PendingUsersList users={pendingUsers} zones={zones} states={states} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">
            All users ({total.toLocaleString()})
          </h2>
          <form className="max-w-sm">
            <Input name="q" defaultValue={q} placeholder="Search by name, email, service no..." />
          </form>
        </div>

        <UsersTable rows={rows} currentUserId={session.user.id} />

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
                    <Link href={`/admin?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
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
                    <Link href={`/admin?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
