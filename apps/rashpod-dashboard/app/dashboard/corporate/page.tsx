"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { FileText, MessageSquare, Briefcase, CheckCircle } from "lucide-react";
import Link from "next/link";

interface CorporateKpis {
  activeRequests: number;
  bidsReceived: number;
  ongoingOffers: number;
  closedDeals: number;
}

interface CorporateRequest {
  id: string;
  title: string;
  status: string;
  bids: number;
  createdAt: string;
}

export default function CorporateOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<CorporateKpis | null>(null);
  const [recentRequests, setRecentRequests] = useState<CorporateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/corporate");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/corporate/kpis");
        // const requestsRes = await fetch("/api/proxy/corporate/requests?limit=5");
        
        setKpis({
          activeRequests: 5,
          bidsReceived: 12,
          ongoingOffers: 3,
          closedDeals: 8,
        });
        setRecentRequests([
          { id: "1", title: "Custom T-shirts for Q1 event", status: "open", bids: 4, createdAt: "2025-01-10" },
          { id: "2", title: "Company swag pack", status: "in_progress", bids: 2, createdAt: "2025-01-15" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const requestColumns: DataTableColumn<CorporateRequest>[] = [
    { key: "title", header: "Request", sortable: true },
    { 
      key: "status", 
      header: "Status",
      render: (val) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blueLight text-brand-blue">
          {val}
        </span>
      ),
    },
    { key: "bids", header: "Bids" },
    { 
      key: "createdAt", 
      header: "Created",
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <Link href={`/dashboard/corporate/requests/${row.id}`} className="text-brand-blue hover:underline text-sm">
          View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout role="corporate">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Corporate Dashboard</h1>
          <p className="text-brand-muted">Manage your bulk orders and custom requests.</p>
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
                  <KpiTile label="Active Requests" value={kpis.activeRequests} icon={<FileText size={24} />} />
                  <KpiTile label="Bids Received" value={kpis.bidsReceived} icon={<MessageSquare size={24} />} />
                  <KpiTile label="Ongoing Offers" value={kpis.ongoingOffers} icon={<Briefcase size={24} />} />
                  <KpiTile label="Closed Deals" value={kpis.closedDeals} icon={<CheckCircle size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Requests</h2>
                <Link href="/dashboard/corporate/requests">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <DataTable
                columns={requestColumns}
                rows={recentRequests}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No requests yet"
                    description="Create a custom request to get started."
                    action={
                      <Link href="/dashboard/corporate/requests/new">
                        <Button variant="primaryBlue">New Request</Button>
                      </Link>
                    }
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
