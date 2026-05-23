import { Skeleton } from "@rashpod/ui";

export default function HomeLoading() {
  return (
    <div className="bg-white text-brand-ink">
      <section className="mx-auto max-w-storefront px-4 pb-7 pt-14 sm:px-5">
        <Skeleton className="mb-4 h-9 w-48" />
        <Skeleton className="mb-3 h-24 w-full max-w-[420px]" />
        <Skeleton className="mb-3 h-14 w-64" />
        <Skeleton className="mb-3 h-10 w-56" />
        <Skeleton className="mt-10 h-20 w-full max-w-[520px]" />
        <div className="mt-12 flex flex-wrap gap-5">
          <Skeleton className="h-[75px] w-[189px] rounded-[19px]" />
          <Skeleton className="h-[75px] w-[189px] rounded-[19px]" />
        </div>
      </section>

      <section className="mx-auto max-w-storefront px-4 py-9 sm:px-5">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="flex gap-5 overflow-hidden pb-7">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-[380px] min-w-[255px] shrink-0 rounded-[8px]" />
          ))}
        </div>
      </section>
    </div>
  );
}
