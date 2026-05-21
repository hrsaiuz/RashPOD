"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw, Search } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type AuditRow = {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
  actor?: { email?: string | null; displayName?: string | null; role?: string | null } | null;
};

type AuditResponse = {
  data?: AuditRow[];
  rows?: AuditRow[];
  items?: AuditRow[];
  page?: number;
  totalPages?: number;
  total?: number;
};

const ACTIONS = ["moderation.pipeline", "product-listing", "design-product-selection", "marketplace-publication", "design.submit"];

export default function Page() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState(ACTIONS[0]);
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  async function load(nextPage = page) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "50" });
      if (action) params.set("action", action);
      if (entityId.trim()) params.set("entityId", entityId.trim());
      const result = await api.get<AuditResponse | AuditRow[]>(`/admin/audit-logs?${params.toString()}`);
      if (Array.isArray(result)) {
        setRows(result);
        setPage(nextPage);
        setTotalPages(1);
      } else {
        setRows(result.data ?? result.rows ?? result.items ?? []);
        setPage(result.page ?? nextPage);
        setTotalPages(result.totalPages ?? 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Moderation Logs</h1>
            <p className="mt-1 text-brand-muted">Review moderation, mockup, listing, and publication audit events.</p>
          </div>
          <Button variant="secondary" onClick={() => load()} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
        </div>

        <Card>
          <div className="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)_auto]">
            <label className="block text-sm font-medium text-brand-ink">
              Action prefix
              <select value={action} onChange={(event) => setAction(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue">
                {ACTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-brand-ink">
              Entity ID
              <Input value={entityId} onChange={(event) => setEntityId(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(1); }} className="mt-2" placeholder="Optional exact entity id" />
            </label>
            <div className="flex items-end"><Button onClick={() => load(1)}><Search size={16} /> Search</Button></div>
          </div>
        </Card>

        {error ? <ErrorState title="Audit log issue" description={error} retry={<Button onClick={() => load()}>Retry</Button>} /> : null}

        {loading ? (
          <Skeleton className="h-72" />
        ) : rows.length === 0 ? (
          <Card><EmptyState icon={<Activity className="text-brand-peach" size={32} />} title="No logs found" description="No audit events match the selected moderation filters." /></Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-app text-brand-muted">
                  <tr>
                    <th className="px-5 py-3 text-left">Action</th>
                    <th className="px-5 py-3 text-left">Entity</th>
                    <th className="px-5 py-3 text-left">Actor</th>
                    <th className="px-5 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-borderSoft">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4"><p className="font-semibold text-brand-ink">{row.action}</p><p className="max-w-xl truncate text-xs text-brand-muted">{metadataSummary(row.metadata)}</p></td>
                      <td className="px-5 py-4"><p>{row.entityType}</p><p className="font-mono text-xs text-brand-muted">{row.entityId}</p></td>
                      <td className="px-5 py-4">{row.actor?.displayName ?? row.actor?.email ?? row.actorId ?? "System"}</td>
                      <td className="px-5 py-4 text-brand-muted">{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-surface-borderSoft px-5 py-4 text-sm text-brand-muted">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1}>Previous</Button>
                <Button size="sm" variant="secondary" onClick={() => load(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function metadataSummary(value: unknown) {
  if (!value) return "No metadata";
  try {
    return JSON.stringify(value);
  } catch {
    return "Metadata unavailable";
  }
}
