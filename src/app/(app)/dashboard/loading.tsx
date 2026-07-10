import { Skeleton } from "@/components/ui/skeleton";
import { StatTilesSkeleton } from "@/components/dashboard/list-page-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <StatTilesSkeleton />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
