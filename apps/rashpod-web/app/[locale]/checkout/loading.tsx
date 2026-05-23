import { Skeleton } from "@rashpod/ui";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-storefront px-4 py-10 sm:px-5">
      <Skeleton className="mb-8 h-10 w-48" />
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <Skeleton className="h-[520px] rounded-[24px]" />
        <Skeleton className="h-[360px] rounded-[24px]" />
      </div>
    </div>
  );
}
