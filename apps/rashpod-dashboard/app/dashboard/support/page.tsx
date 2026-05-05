"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Ticket, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

interface SupportKpis {
  openTickets: number;
  slaBreaches: number;
  avgResponse: number;
  resolvedToday: number;
}

interface TicketEntry {
  id: string;
  subject: string;
  customer: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function SupportOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<SupportKpis | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/support");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/support/kpis");
        // const ticketsRes = await fetch("/api/proxy/support/tickets?limit=5");
        
        setKpis({
          openTickets: 18,
          slaBreaches: 2,
          avgResponse: 1.2,
          resolvedToday: 14,
        });
        setRecentTickets([
          { id: "1", subject: "Order not received", customer: "john@example.com", status: "open", priority: "high", createdAt: "2025-01-20T10:30:00" },
          { id: "2", subject: "Design approval question", customer: "jane@example.com", status: "in_progress", priority: "medium", createdAt: "2025-01-20T09:15:00" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const ticketColumns: DataTableColumn<TicketEntry>[] = [
    { key: "subject", header: "Subject", sortable: true },
    { key: "customer", header: "Customer" },
    { 
      key: "status", 
      header: "Status",
      render: (val) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blueLight text-brand-blue">
          {val}
        </span>
      ),
    },
    { 
      key: "priority", 
      header: "Priority",
      render: (val) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          val === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {val}
        </span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <Link href={`/dashboard/support/tickets/${row.id}`} className="text-brand-blue hover:underline text-sm">
          View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout role="support">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Support Dashboard</h1>
          <p className="text-brand-muted">Manage customer tickets and support requests.</p>
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
                  <KpiTile label="Open Tickets" value={kpis.openTickets} icon={<Ticket size={24} />} />
                  <KpiTile label="SLA Breaches" value={kpis.slaBreaches} icon={<AlertTriangle size={24} />} />
                  <KpiTile label="Avg Response (hrs)" value={kpis.avgResponse} icon={<Clock size={24} />} />
                  <KpiTile label="Resolved Today" value={kpis.resolvedToday} icon={<CheckCircle size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Tickets</h2>
                <Link href="/dashboard/support/tickets">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <DataTable
                columns={ticketColumns}
                rows={recentTickets}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No recent tickets"
                    description="Support tickets will appear here."
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
