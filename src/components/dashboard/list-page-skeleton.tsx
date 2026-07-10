import { Skeleton } from "@/components/ui/skeleton";

export function StatTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-4 rounded-full" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b p-3 last:border-b-0">
          <div className="flex gap-6">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton({
  withStatTiles = false,
  rows = 6,
  cols = 5,
}: {
  withStatTiles?: boolean;
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      {withStatTiles && <StatTilesSkeleton />}
      <Skeleton className="h-8 w-64 rounded-lg" />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}
