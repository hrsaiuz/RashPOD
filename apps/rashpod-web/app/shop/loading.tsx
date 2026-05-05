import { Skeleton, Card } from "@rashpod/ui";

export default function ShopLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="mb-8">
        <Skeleton className="h-10 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <Card className="p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </Card>
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} variant="lift" className="overflow-hidden">
                <Skeleton className="w-full h-64" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
