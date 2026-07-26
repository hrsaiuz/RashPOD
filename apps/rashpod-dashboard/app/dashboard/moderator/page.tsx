"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button, StatusBadge } from "@rashpod/ui";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "../../../lib/api";

interface ModeratorKpis {
  pendingDesigns: number;
  needsFix: number;
  approvedToday: number;
  rejectedToday: number;
  oldestPendingHours: number;
}

interface ModerationDecision {
  id: string;
  designTitle: string;
  designer: string;
  decision: string;
  reason?: string | null;
  timestamp: string;
}

interface ModeratorOverviewResponse extends ModeratorKpis {
  recentDecisions: ModerationDecision[];
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
        const data = await api.get<ModeratorOverviewResponse>("/dashboard/moderator");
        setKpis(data);
        setRecentDecisions(data.recentDecisions);
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
        <StatusBadge status={String(val).toLowerCase()} label={formatDecision(String(val))} />
      ),
    },
    { 
      key: "timestamp", 
      header: "Time",
      render: (val) => new Date(String(val)).toLocaleString(),
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
                  <KpiTile label="Oldest Pending (hours)" value={kpis.oldestPendingHours} icon={<Clock size={24} />} />
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

function formatDecision(decision: string) {
  return decision
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
