"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Factory, Clock, TruckIcon, Activity } from "lucide-react";
import Link from "next/link";

interface ProductionKpis {
  queueLength: number;
  inProgress: number;
  shippedToday: number;
  avgCycle: number;
}

interface ProductionJob {
  id: string;
  orderNumber: string;
  productType: string;
  status: string;
  assignedTo: string;
}

export default function ProductionOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<ProductionKpis | null>(null);
  const [activeJobs, setActiveJobs] = useState<ProductionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/production");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/production/kpis");
        // const jobsRes = await fetch("/api/proxy/production/jobs?status=in_progress&limit=5");
        
        setKpis({
          queueLength: 15,
          inProgress: 8,
          shippedToday: 12,
          avgCycle: 18.5,
        });
        setActiveJobs([
          { id: "1", orderNumber: "ORD-001", productType: "T-Shirt", status: "printing", assignedTo: "Station A" },
          { id: "2", orderNumber: "ORD-002", productType: "Poster", status: "quality_check", assignedTo: "Station B" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const jobColumns: DataTableColumn<ProductionJob>[] = [
    { key: "orderNumber", header: "Order #", sortable: true },
    { key: "productType", header: "Product" },
    { 
      key: "status", 
      header: "Status",
      render: (val) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blueLight text-brand-blue">
          {val}
        </span>
      ),
    },
    { key: "assignedTo", header: "Station" },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <Link href={`/dashboard/production/jobs/${row.id}`} className="text-brand-blue hover:underline text-sm">
          View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout role="production">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Production Dashboard</h1>
          <p className="text-brand-muted">Monitor the production queue and active jobs.</p>
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
                  <KpiTile label="Queue Length" value={kpis.queueLength} icon={<Factory size={24} />} />
                  <KpiTile label="In Progress" value={kpis.inProgress} icon={<Activity size={24} />} />
                  <KpiTile label="Shipped Today" value={kpis.shippedToday} icon={<TruckIcon size={24} />} />
                  <KpiTile label="Avg Cycle (hrs)" value={kpis.avgCycle} icon={<Clock size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Active Jobs</h2>
                <Link href="/dashboard/production/jobs">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <DataTable
                columns={jobColumns}
                rows={activeJobs}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No active jobs"
                    description="Production queue is empty."
                  />
                }
              />
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

