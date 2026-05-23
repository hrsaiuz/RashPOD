"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  useEffect(() => {
    if (isLoading || !user) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/proxy/support/tickets`);
        if (res.status === 401 || res.status === 403) {
          router.push("/auth/login");
          return;
        }
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        setTickets(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, isLoading, router]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <DashboardLayout role="support">
      <PageHeader
        title="Support Tickets"
        actions={
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "in_progress", "resolved"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "primaryBlue" : "secondary"}
                onClick={() => setFilter(f)}
              >
                {f.replace("_", " ")}
              </Button>
            ))}
          </div>
        }
      />

      {error ? (
        <ErrorState title="Could not load tickets" description={error} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <DataTable
          mobileMode="cards"
          columns={[
            {
              key: "subject",
              header: "Subject",
              render: (_, row: Ticket) => (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/support/tickets/${row.id}`)}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  {row.subject}
                </button>
              ),
            },
            { key: "customerName", header: "Customer" },
            {
              key: "priority",
              header: "Priority",
              render: (value) => <StatusBadge status={String(value)} />,
            },
            {
              key: "status",
              header: "Status",
              render: (value) => <StatusBadge status={String(value)} />,
            },
            {
              key: "createdAt",
              header: "Created",
              render: (value) => new Date(String(value)).toLocaleDateString(),
            },
          ]}
          rows={filtered}
          emptyState={<EmptyState title="No tickets found" description="Try a different filter." />}
        />
      )}
    </DashboardLayout>
  );
}
