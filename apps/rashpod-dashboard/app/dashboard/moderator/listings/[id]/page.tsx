"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import DashboardLayout from "../../../dashboard-layout";
import { api, type Listing } from "../../../../../lib/api";
import { useAuth } from "../../../../auth/auth-provider";
import { ModeratorListingWizard } from "../../moderator-listing-wizard";

type AdminListingDetail = Listing & {
  designer?: { email?: string; displayName?: string; handle?: string | null } | null;
  designAsset?: { id: string; title?: string; status?: string } | null;
  designProductSelection?: {
    id: string;
    pipeline?: string;
    mockupAssets?: Array<{
      id: string;
      mockupType: string;
      status: string;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
    }>;
    localBaseProduct?: {
      name?: string;
      availableColors?: unknown;
      availableSizes?: unknown;
      defaultPrice?: string | number | null;
      currency?: string;
    } | null;
    printfulProductTemplate?: {
      displayName?: string;
      defaultRetailPrice?: string | number | null;
      currency?: string;
      allowedColorVariantIds?: unknown;
      allowedSizeVariantIds?: unknown;
    } | null;
  } | null;
};

export default function ModeratorListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/moderator/listings/${params.id}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, params.id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setListing(await api.get<AdminListingDetail>(`/admin/listings/${params.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard/moderator/listings">
            <Button variant="ghost"><ArrowLeft size={18} /> Back to listings</Button>
          </Link>
          {listing ? <StatusBadge status={listing.status} /> : null}
        </div>

        {error ? <ErrorState title="Listing issue" description={error} retry={<Button onClick={load}>Retry</Button>} /> : null}

        {loading ? (
          <Skeleton className="h-64" />
        ) : !listing ? (
          <EmptyState title="Listing not found" description="This listing is no longer available." />
        ) : (
          <>
            <Card>
              <h1 className="text-3xl font-bold text-brand-ink">{listing.title}</h1>
              <p className="mt-1 text-brand-muted">
                Designer: {listing.designer?.displayName ?? listing.designer?.email ?? "Unknown"}
                {listing.designAsset?.title ? ` · Design: ${listing.designAsset.title}` : ""}
              </p>
            </Card>
            <ModeratorListingWizard listing={listing} designTitle={listing.designAsset?.title} onSaved={load} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
