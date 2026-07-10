import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/dashboard/list-page-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={6} cols={6} />
      </div>
    </div>
  );
}
