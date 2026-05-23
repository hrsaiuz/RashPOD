import { Skeleton } from "@rashpod/ui";

export default function BusinessLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Skeleton className="mb-8 h-10 w-48" />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    </div>
  );
}
