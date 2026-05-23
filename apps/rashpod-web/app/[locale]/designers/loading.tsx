import { Skeleton, Card } from "@rashpod/ui";

export default function DesignersLoading() {
  return (
    <div className="max-w-storefront mx-auto px-6 py-10">
      <div className="bg-rash-hero rounded-[32px] px-6 py-14 text-center mb-16 shadow-soft">
        <Skeleton className="w-20 h-20 rounded-full mx-auto mb-6" />
        <Skeleton className="h-10 w-72 mx-auto mb-4" />
        <Skeleton className="h-5 w-full max-w-2xl mx-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <Skeleton className="h-16 w-16 rounded-lg" />
              <Skeleton className="h-16 w-16 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
