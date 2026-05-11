"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button, StatusBadge } from "@rashpod/ui";
import { DollarSign, Tag, Search, Upload, TrendingUp } from "lucide-react";
import Link from "next/link";

interface DesignerKpis {
  pendingEarnings: number;
  listingsLive: number;
  inModeration: number;
  designsUploaded: number;
}

interface RoyaltyEntry {
  id: string;
  listingTitle: string;
  amount: number;
  status: string;
  date: string;
}

export default function DesignerOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<DesignerKpis | null>(null);
  const [recentRoyalties, setRecentRoyalties] = useState<RoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [overview, designs] = await Promise.all([
          fetch("/api/proxy/dashboard/designer").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/proxy/designs").then((r) => (r.ok ? r.json() : [])) as Promise<Array<{ status: string }>>,
        ]);
        const inModeration = Array.isArray(designs) ? designs.filter((d) => d.status === "SUBMITTED" || d.status === "NEEDS_FIX").length : 0;
        setKpis({
          pendingEarnings: 0,
          listingsLive: overview?.listings ?? 0,
          inModeration,
          designsUploaded: overview?.designs ?? (Array.isArray(designs) ? designs.length : 0),
        });
        setRecentRoyalties([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const royaltyColumns: DataTableColumn<RoyaltyEntry>[] = [
    { key: "listingTitle", header: "Listing", sortable: true },
    { 
      key: "amount", 
      header: "Amount",
      render: (val) => <span className="tabular-nums font-medium text-brand-ink">${Number(val).toFixed(2)}</span>,
    },
    { 
      key: "status", 
      header: "Status",
      render: (val) => <StatusBadge status={String(val)} />,
    },
    { 
      key: "date", 
      header: "Date",
      render: (val) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Designer Dashboard</h1>
          <p className="text-brand-muted">Track your designs, listings, and earnings.</p>
        </div>

        {error && (
          <ErrorState
            title="Failed to load dashboard"
            description={error}
            retry={
              <Button onClick={() => window.location.reload()} variant="primaryBlue">
                Retry
              </Button>
            }
          />
        )}

        {!error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : kpis ? (
                <>
                  <KpiTile 
                    label="Pending Earnings" 
                    value={`${kpis.pendingEarnings.toFixed(0)} UZS`} 
                    icon={<DollarSign size={24} />}
                  />
                  <KpiTile label="Listings Live" value={kpis.listingsLive} icon={<Tag size={24} />} />
                  <KpiTile label="In Moderation" value={kpis.inModeration} icon={<Search size={24} />} />
                  <KpiTile label="Designs Uploaded" value={kpis.designsUploaded} icon={<Upload size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Royalties</h2>
                <Link href="/dashboard/designer/royalties">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <DataTable
                columns={royaltyColumns}
                rows={recentRoyalties}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No royalties yet"
                    description="Start selling designs to earn royalties."
                  />
                }
              />
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-peachLight rounded-xl">
                  <Upload className="text-brand-peach" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-ink mb-2">Upload New Design</h3>
                  <p className="text-sm text-brand-muted mb-4">
                    Create a new design and list it for sale on RashPOD marketplace.
                  </p>
                  <Link href="/dashboard/designer/designs/new">
                    <Button variant="primaryBlue">Upload Design</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
