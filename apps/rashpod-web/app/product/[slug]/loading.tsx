import { Skeleton, Card } from "@rashpod/ui";

export default function ProductLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <Skeleton className="h-5 w-48 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image skeleton */}
        <div>
          <Skeleton className="w-full h-[500px] rounded-3xl" />
          <div className="flex gap-3 mt-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="w-20 h-20 rounded-xl" />
          </div>
        </div>

        {/* Product details skeleton */}
        <div>
          <Skeleton className="h-10 w-3/4 mb-3" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-8 w-32 mb-8" />

          <div className="space-y-6">
            <div>
              <Skeleton className="h-5 w-20 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-20 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-12 w-16 rounded-xl" />
                <Skeleton className="h-12 w-16 rounded-xl" />
                <Skeleton className="h-12 w-16 rounded-xl" />
              </div>
            </div>

            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
