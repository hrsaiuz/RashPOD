"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, RefreshCw, Search } from "lucide-react";
import { Button, Card, Drawer, EmptyState, ErrorState, Input, Skeleton } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { Feedback, FeedbackBanner, PageShell, Pagination } from "../super-admin-ui";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: { email?: string | null; displayName?: string | null; role?: string | null } | null;
};

type AuditResponse = {
  items: AuditRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function SuperAdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filters, setFilters] = useState({ actorId: "", action: "", entityType: "", entityId: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "25" });
      Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
      const data = await api.get<AuditResponse>(`/admin/audit-logs?${params}`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination ?? { page: nextPage, limit: 25, total: 0, totalPages: 1 });
      setPage(data.pagination?.page ?? nextPage);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, []);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1);
  }

  async function openDetail(row: AuditRow) {
    setSelected(row);
    setDetailLoading(true);
    setFeedback(null);
    try {
      const detail = await api.get<AuditRow>(`/admin/audit-logs/${row.id}`);
      setSelected({ ...row, ...detail });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not load audit details" });
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <PageShell
      title="Platform audit logs"
      description="Investigate sensitive activity by actor, action, and affected entity. Newest events appear first."
      icon={<Activity size={22} />}
      action={<Button variant="secondary" onClick={() => void load(page)} aria-label="Refresh audit logs"><RefreshCw size={16} aria-hidden="true" /></Button>}
    >
      <FeedbackBanner feedback={selected ? null : feedback} onDismiss={() => setFeedback(null)} />
      <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <label className="text-sm font-semibold">Action<Input className="mt-2" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} placeholder="e.g. user.role.update" /></label>
        <label className="text-sm font-semibold">Entity type<Input className="mt-2" value={filters.entityType} onChange={(event) => setFilters({ ...filters, entityType: event.target.value })} placeholder="e.g. User" /></label>
        <label className="text-sm font-semibold">Entity ID<Input className="mt-2 font-mono" value={filters.entityId} onChange={(event) => setFilters({ ...filters, entityId: event.target.value })} /></label>
        <label className="text-sm font-semibold">Actor ID<Input className="mt-2 font-mono" value={filters.actorId} onChange={(event) => setFilters({ ...filters, actorId: event.target.value })} /></label>
        <Button type="submit" className="self-end" loading={loading}><Search size={16} aria-hidden="true" />Filter</Button>
      </form>

      {loading ? <Skeleton className="h-72" /> : loadError ? (
        <ErrorState title="Could not load audit logs" description={loadError} retry={<Button onClick={() => void load(page)}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No matching audit entries" description="Adjust the filters or clear them to review recent activity." />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">Platform audit events</caption>
              <thead className="bg-surface-app text-brand-muted">
                <tr><th scope="col" className="px-5 py-3 text-left">Action</th><th scope="col" className="px-5 py-3 text-left">Entity</th><th scope="col" className="px-5 py-3 text-left">Actor</th><th scope="col" className="px-5 py-3 text-left">Time</th><th scope="col" className="px-5 py-3 text-right">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-app/60">
                    <td className="px-5 py-4 font-semibold">{row.action}</td>
                    <td className="px-5 py-4"><p>{row.entityType}</p><p className="font-mono text-xs text-brand-muted">{row.entityId}</p></td>
                    <td className="px-5 py-4"><p>{row.actor?.displayName || row.actor?.email || row.actorEmail || "System"}</p><p className="text-xs text-brand-muted">{row.actor?.role || row.actorRole || "SYSTEM"}</p></td>
                    <td className="px-5 py-4 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => void openDetail(row)}>Inspect</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} disabled={loading} onPageChange={(next) => void load(next)} />
        </Card>
      )}

      <Drawer open={Boolean(selected)} side="right" title="Audit event details" onClose={() => setSelected(null)}>
        {selected ? (
          detailLoading ? <Skeleton className="h-72" /> : (
            <div className="space-y-4">
              <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <dl className="space-y-4 text-sm">
              <Detail label="Action" value={selected.action} />
              <Detail label="Entity" value={`${selected.entityType} · ${selected.entityId}`} mono />
              <Detail label="Actor" value={selected.actor?.email || selected.actorEmail || selected.actorId || "System"} />
              <Detail label="Actor role" value={selected.actor?.role || selected.actorRole || "SYSTEM"} />
              <Detail label="Time" value={new Date(selected.createdAt).toLocaleString()} />
              <Detail label="IP address" value={selected.ip || "Not captured"} mono />
              <Detail label="User agent" value={selected.userAgent || "Not captured"} />
              <div>
                <dt className="font-semibold text-brand-ink">Metadata</dt>
                <dd><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-app p-3 text-xs leading-5">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre></dd>
              </div>
            </dl>
            </div>
          )
        ) : null}
      </Drawer>
    </PageShell>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="font-semibold text-brand-ink">{label}</dt><dd className={`mt-1 break-words text-brand-muted ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
