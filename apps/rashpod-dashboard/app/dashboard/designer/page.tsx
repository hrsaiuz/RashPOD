"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
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
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/designer/kpis");
        // const royaltiesRes = await fetch("/api/proxy/designer/royalties?limit=5");
        
        // Mock data for now
        setKpis({
          pendingEarnings: 234.50,
          listingsLive: 18,
          inModeration: 3,
          designsUploaded: 42,
        });
        setRecentRoyalties([
          { id: "1", listingTitle: "Abstract Pattern Tee", amount: 12.50, status: "paid", date: "2025-01-10" },
          { id: "2", listingTitle: "Mountain Landscape Poster", amount: 8.75, status: "pending", date: "2025-01-15" },
        ]);
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
      render: (val) => `$${val.toFixed(2)}`,
    },
    { 
      key: "status", 
      header: "Status",
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          val === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {val}
        </span>
      ),
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
              <Button onClick={() => window.location.reload()} variant="primary">
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
                    value={`$${kpis.pendingEarnings.toFixed(2)}`} 
                    icon={<DollarSign size={24} />}
                    delta={{ value: 12, isPositive: true }}
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
                    <Button variant="primary">Upload Design</Button>
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
