import { Skeleton } from "@/components/ui/skeleton";
import { StatTilesSkeleton, TableSkeleton } from "@/components/dashboard/list-page-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StatTilesSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={4} cols={4} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    </div>
  );
}
