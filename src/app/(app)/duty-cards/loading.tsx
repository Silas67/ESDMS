import { ListPageSkeleton } from "@/components/dashboard/list-page-skeleton";

export default function Loading() {
  return <ListPageSkeleton rows={8} cols={5} />;
}
