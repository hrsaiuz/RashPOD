"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button, ErrorState } from "@rashpod/ui";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

type NotificationRow = { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string; actionUrl?: string | null; severity: string };

function rolePath(role?: string) {
  const value = (role || "customer").toLowerCase().replace(/_/g, "-");
  if (value === "support-staff") return "support";
  if (value === "operations-manager") return "admin";
  if (value === "finance-staff") return "finance";
  if (value === "production-staff") return "production";
  if (value === "corporate-client") return "customer";
  return value;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const role = useMemo(() => rolePath(user?.role), [user?.role]);

  async function load() {
    const res = await fetch("/api/proxy/notifications");
    if (res.status === 401) { router.push("/auth/login?next=/dashboard/notifications"); return; }
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    setRows(await res.json());
  }

  useEffect(() => {
    if (isLoading || !user) return;
    setLoading(true);
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load notifications.")).finally(() => setLoading(false));
  }, [user, isLoading]);

  async function markAllRead() {
    await fetch("/api/proxy/notifications/mark-all-read", { method: "POST" });
    await load();
  }

  async function open(row: NotificationRow) {
    if (!row.readAt) await fetch(`/api/proxy/notifications/${row.id}/read`, { method: "PATCH" });
    if (row.actionUrl) router.push(row.actionUrl);
    else await load();
  }

  return (
    <DashboardLayout role={role}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Notifications</h1>
          <p className="text-sm text-brand-muted">In-app updates, support replies, production alerts, and account events.</p>
        </div>
        <Button variant="secondary" onClick={markAllRead}><CheckCheck size={16} /> Mark all read</Button>
      </div>
      {error ? <ErrorState title="Notification issue" description={error} /> : null}
      <div className="space-y-3">
        {loading ? <div className="rounded-xl border border-brand-line bg-white p-5 text-sm text-brand-muted">Loading notifications...</div> : null}
        {!loading && rows.length === 0 ? <div className="rounded-xl border border-brand-line bg-white p-8 text-center text-sm text-brand-muted"><Bell className="mx-auto mb-3 text-brand-blue" /> No notifications yet.</div> : null}
        {rows.map((row) => (
          <button key={row.id} onClick={() => open(row)} className="block w-full rounded-2xl border border-brand-line bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-brand-ink">{row.title}</span>{!row.readAt ? <span className="h-2 w-2 rounded-full bg-brand-peach" /> : null}</div>
                <p className="mt-1 text-sm text-brand-muted">{row.body}</p>
              </div>
              <span className="shrink-0 text-xs text-brand-muted">{new Date(row.createdAt).toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>
    </DashboardLayout>
  );
}
