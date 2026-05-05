"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Package, DollarSign, Users, AlertCircle } from "lucide-react";
import Link from "next/link";

interface AdminKpis {
  totalOrders: number;
  revenue: number;
  newSignups: number;
  royaltiesPending: number;
}

interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  user: string;
  timestamp: string;
}

export default function AdminOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/admin");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/admin/kpis");
        // const activityRes = await fetch("/api/proxy/admin/activity?limit=5");
        
        setKpis({
          totalOrders: 342,
          revenue: 12450.75,
          newSignups: 18,
          royaltiesPending: 2340.50,
        });
        setRecentActivity([
          { id: "1", type: "order", description: "New order placed", user: "john@example.com", timestamp: "2025-01-20T10:30:00" },
          { id: "2", type: "designer", description: "New designer registered", user: "jane@example.com", timestamp: "2025-01-20T09:15:00" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const activityColumns: DataTableColumn<ActivityEntry>[] = [
    { 
      key: "type", 
      header: "Type",
      render: (val) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blueLight text-brand-blue">
          {val}
        </span>
      ),
    },
    { key: "description", header: "Description" },
    { key: "user", header: "User" },
    { 
      key: "timestamp", 
      header: "Time",
      render: (val) => new Date(val).toLocaleTimeString(),
    },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Admin Dashboard</h1>
          <p className="text-brand-muted">Platform-wide overview and management.</p>
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
                    label="Total Orders" 
                    value={kpis.totalOrders} 
                    icon={<Package size={24} />}
                    delta={{ value: 15, isPositive: true }}
                  />
                  <KpiTile 
                    label="Revenue" 
                    value={`$${kpis.revenue.toFixed(2)}`} 
                    icon={<DollarSign size={24} />}
                    delta={{ value: 22, isPositive: true }}
                  />
                  <KpiTile label="New Signups" value={kpis.newSignups} icon={<Users size={24} />} />
                  <KpiTile 
                    label="Royalties Pending" 
                    value={`$${kpis.royaltiesPending.toFixed(2)}`} 
                    icon={<AlertCircle size={24} />} 
                  />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Activity</h2>
              </div>
              <DataTable
                columns={activityColumns}
                rows={recentActivity}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No recent activity"
                    description="Platform activity will appear here."
                  />
                }
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-brand-ink mb-4">Orders</h3>
                <Link href="/dashboard/admin/orders">
                  <Button variant="ghost" className="w-full justify-start">
                    View All Orders
                  </Button>
                </Link>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-brand-ink mb-4">Worker Jobs</h3>
                <Link href="/dashboard/admin/worker-jobs">
                  <Button variant="ghost" className="w-full justify-start">
                    View Job Queue
                  </Button>
                </Link>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-brand-ink mb-4">Delivery Settings</h3>
                <Link href="/dashboard/admin/delivery-settings">
                  <Button variant="ghost" className="w-full justify-start">
                    Configure Delivery
                  </Button>
                </Link>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
