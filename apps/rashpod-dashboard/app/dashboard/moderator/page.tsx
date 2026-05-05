"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface ModeratorKpis {
  pendingDesigns: number;
  approvedToday: number;
  rejectedToday: number;
  avgSla: number;
}

interface ModerationDecision {
  id: string;
  designTitle: string;
  designer: string;
  decision: string;
  timestamp: string;
}

export default function ModeratorOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<ModeratorKpis | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<ModerationDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/moderator");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/moderator/kpis");
        // const decisionsRes = await fetch("/api/proxy/moderator/decisions?limit=5");
        
        setKpis({
          pendingDesigns: 24,
          approvedToday: 12,
          rejectedToday: 3,
          avgSla: 2.4,
        });
        setRecentDecisions([
          { id: "1", designTitle: "Abstract Pattern", designer: "john@example.com", decision: "approved", timestamp: "2025-01-20T10:30:00" },
          { id: "2", designTitle: "Mountain Scene", designer: "jane@example.com", decision: "rejected", timestamp: "2025-01-20T09:15:00" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const decisionColumns: DataTableColumn<ModerationDecision>[] = [
    { key: "designTitle", header: "Design", sortable: true },
    { key: "designer", header: "Designer" },
    { 
      key: "decision", 
      header: "Decision",
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          val === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {val}
        </span>
      ),
    },
    { 
      key: "timestamp", 
      header: "Time",
      render: (val) => new Date(val).toLocaleTimeString(),
    },
  ];

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Moderation Dashboard</h1>
          <p className="text-brand-muted">Review and approve designer submissions.</p>
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
                  <KpiTile label="Pending Designs" value={kpis.pendingDesigns} icon={<Search size={24} />} />
                  <KpiTile label="Approved Today" value={kpis.approvedToday} icon={<CheckCircle size={24} />} />
                  <KpiTile label="Rejected Today" value={kpis.rejectedToday} icon={<XCircle size={24} />} />
                  <KpiTile label="Avg SLA (hours)" value={kpis.avgSla} icon={<Clock size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Decisions</h2>
                <Link href="/dashboard/moderator/designs">
                  <Button variant="ghost" size="sm">View Queue</Button>
                </Link>
              </div>
              <DataTable
                columns={decisionColumns}
                rows={recentDecisions}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No recent decisions"
                    description="Your moderation decisions will appear here."
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
