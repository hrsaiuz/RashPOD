import { Skeleton } from "@rashpod/ui";

export default function FilmLoading() {
  return (
    <div className="mx-auto max-w-storefront px-4 py-10 sm:px-5">
      <Skeleton className="mb-8 h-10 w-40" />
      <div className="grid gap-7 lg:grid-cols-[300px_1fr]">
        <Skeleton className="h-[420px] rounded-[12px]" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-[280px] rounded-[12px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
