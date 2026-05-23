"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button, PageHeader, StatusBadge } from "@rashpod/ui";
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
        const [kpiRes, ticketsRes] = await Promise.all([
          fetch("/api/proxy/support/kpis"),
          fetch("/api/proxy/support/tickets?limit=5"),
        ]);
        if (kpiRes.status === 401 || ticketsRes.status === 401) {
          router.push("/auth/login?next=/dashboard/support");
          return;
        }
        if (!kpiRes.ok || !ticketsRes.ok) throw new Error("Failed to load support dashboard data");
        setKpis(await kpiRes.json());
        setRecentTickets(await ticketsRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const ticketColumns: DataTableColumn<TicketEntry>[] = [
    { key: "subject", header: "Subject", sortable: true, render: (_val, row) => <button onClick={() => router.push(`/dashboard/support/tickets/${row.id}`)} className="font-semibold text-brand-blue hover:underline">{row.subject}</button> },
    { key: "customer", header: "Customer" },
    { 
      key: "status", 
      header: "Status",
      render: (val) => <StatusBadge status={String(val).toLowerCase()} label={String(val)} />,
    },
    { 
      key: "priority", 
      header: "Priority",
      render: (val) => {
        const key = String(val).toLowerCase();
        if (key === "high" || key === "urgent") return <StatusBadge status="high" label={String(val)} />;
        if (key === "low") return <StatusBadge status="low" label={String(val)} />;
        return <StatusBadge status="medium" label={String(val)} />;
      },
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
        <PageHeader title="Support Dashboard" description="Manage customer tickets and support requests." />

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
