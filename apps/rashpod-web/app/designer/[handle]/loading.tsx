import { Skeleton, Card } from "@rashpod/ui";

export default function DesignerLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      {/* Designer header skeleton */}
      <div className="mb-12">
        <div className="flex items-start gap-6">
          <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <Card className="p-6">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
      </div>

      {/* Products grid skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
  );
}
