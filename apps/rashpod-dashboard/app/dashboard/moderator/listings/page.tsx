"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RefreshCw, Search, ShieldAlert, XCircle } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";
import { ModeratorActionDialog } from "../../../../components/moderator/ModeratorActionDialog";

type ListingRow = {
  id: string;
  type: "PRODUCT" | "FILM";
  status: string;
  title: string;
  slug: string;
  price: string | number;
  currency: string;
  updatedAt: string;
  publishedAt?: string | null;
  designer?: { email?: string; displayName?: string; handle?: string | null } | null;
  designAsset?: { title?: string; status?: string } | null;
};

const STATUSES = ["", "DRAFT", "READY_TO_PUBLISH", "PUBLISHED", "REJECTED", "SUSPENDED"];

export default function Page() {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<{ id: string; title: string; status: "PUBLISHED" | "REJECTED" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const filtered = useMemo(() => rows, [rows]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function load() {
    requestRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "25", page: String(page) });
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await api.get<{
        items: ListingRow[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/listings?${params.toString()}`, { signal: controller.signal });
      if (requestId !== requestIdRef.current) return;
      setRows(response.items);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function runSearch() {
    if (page === 1) void load();
    else setPage(1);
  }

  async function setListingStatus(id: string, nextStatus: "PUBLISHED" | "REJECTED", reason?: string) {
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      await api.post(`/admin/listings/${id}/status`, { status: nextStatus, reason: reason?.trim() || undefined });
      await load();
      setMessage(nextStatus === "PUBLISHED" ? "Listing published." : "Listing rejected and the reason was recorded.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
      return false;
    } finally {
      setSavingId("");
    }
  }

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Listing Review</h1>
            <p className="mt-1 text-brand-muted">Review draft product and film listings before they appear in shop surfaces.</p>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
        </div>

        <Card>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
            <label className="block text-sm font-medium text-brand-ink">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20">
                {STATUSES.map((item) => <option key={item || "ALL"} value={item}>{item || "All statuses"}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-brand-ink">
              Search
              <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} className="mt-2" placeholder="Title, slug, designer" />
            </label>
            <div className="flex items-end"><Button onClick={runSearch}><Search size={16} /> Search</Button></div>
          </div>
        </Card>

        {error ? <ErrorState title="Listing review issue" description={error} retry={<Button onClick={load}>Retry</Button>} /> : null}
        {message ? <p aria-live="polite" className="rounded-2xl border border-semantic-success/20 bg-semantic-success/5 px-4 py-3 text-sm text-semantic-success">{message}</p> : null}

        {loading ? (
          <Skeleton className="h-72" />
        ) : !filtered.length ? (
          <Card><EmptyState icon={<ShieldAlert className="text-brand-peach" size={32} />} title="No listings found" description="There are no listings matching the current review filters." /></Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="grid gap-3 p-4 md:hidden">
              {filtered.map((item) => (
                <article key={item.id} className="rounded-2xl border border-surface-borderSoft bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard/moderator/listings/${item.id}`} className="font-semibold text-brand-ink hover:text-brand-blue">
                        {item.title}
                      </Link>
                      <p className="mt-1 break-all text-xs text-brand-muted">{item.type} · {item.slug}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-brand-muted">Designer</dt>
                      <dd className="mt-1 text-brand-ink">{item.designer?.displayName ?? item.designer?.email ?? "Unknown"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-muted">Price</dt>
                      <dd className="mt-1 font-semibold text-brand-ink">{formatMoney(item.price, item.currency)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => setPendingAction({ id: item.id, title: item.title, status: "PUBLISHED" })} disabled={savingId === item.id || item.status === "PUBLISHED"}><CheckCircle2 size={14} /> Publish</Button>
                    <Button size="sm" variant="danger" onClick={() => { setRejectionReason(""); setPendingAction({ id: item.id, title: item.title, status: "REJECTED" }); }} disabled={savingId === item.id || item.status === "REJECTED"}><XCircle size={14} /> Reject</Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface-app text-brand-muted">
                  <tr>
                    <th className="px-5 py-3 text-left">Listing</th>
                    <th className="px-5 py-3 text-left">Designer</th>
                    <th className="px-5 py-3 text-left">Price</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-borderSoft">
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/moderator/listings/${item.id}`} className="font-semibold text-brand-ink hover:text-brand-blue">
                          {item.title}
                        </Link>
                        <p className="text-xs text-brand-muted">{item.type} · {item.slug} · {item.designAsset?.title ?? "No design title"}</p>
                      </td>
                      <td className="px-5 py-4">{item.designer?.displayName ?? item.designer?.email ?? "Unknown"}</td>
                      <td className="px-5 py-4 font-semibold text-brand-ink">{formatMoney(item.price, item.currency)}</td>
                      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => setPendingAction({ id: item.id, title: item.title, status: "PUBLISHED" })} disabled={savingId === item.id || item.status === "PUBLISHED"}><CheckCircle2 size={14} /> Publish</Button>
                          <Button size="sm" variant="danger" onClick={() => { setRejectionReason(""); setPendingAction({ id: item.id, title: item.title, status: "REJECTED" }); }} disabled={savingId === item.id || item.status === "REJECTED"}><XCircle size={14} /> Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {!loading && !error && total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-muted">{total.toLocaleString()} listings · Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>
      <ModeratorActionDialog
        open={pendingAction !== null}
        title={pendingAction?.status === "REJECTED" ? "Reject this listing?" : "Publish this listing?"}
        description={pendingAction?.status === "REJECTED"
          ? `${pendingAction?.title ?? "This listing"} will be removed from the publication workflow. The reason will be stored in the audit log.`
          : `${pendingAction?.title ?? "This listing"} will become visible in the shop immediately.`}
        confirmLabel={pendingAction?.status === "REJECTED" ? "Reject listing" : "Publish listing"}
        destructive={pendingAction?.status === "REJECTED"}
        busy={savingId !== ""}
        confirmDisabled={pendingAction?.status === "REJECTED" && rejectionReason.trim().length < 3}
        initialFocus={pendingAction?.status === "REJECTED" ? "firstField" : "confirm"}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (await setListingStatus(pendingAction.id, pendingAction.status, rejectionReason)) {
            setPendingAction(null);
          }
        }}
      >
        {pendingAction?.status === "REJECTED" ? (
          <label htmlFor="listing-rejection-reason" className="block text-sm font-medium text-brand-ink">
            Rejection reason
            <Textarea
              id="listing-rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="mt-2 min-h-28"
              placeholder="Explain what must be corrected before another review."
              autoFocus
            />
          </label>
        ) : null}
      </ModeratorActionDialog>
    </DashboardLayout>
  );
}

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value);
  return `${Number.isFinite(amount) ? amount.toLocaleString() : value} ${currency}`;
}
