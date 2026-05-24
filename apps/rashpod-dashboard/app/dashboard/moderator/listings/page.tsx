"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RefreshCw, Search, ShieldAlert, XCircle } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

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

  const filtered = useMemo(() => rows, [rows]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      setRows(await api.get<ListingRow[]>(`/admin/listings?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  async function setListingStatus(id: string, nextStatus: string) {
    setSavingId(id);
    setError("");
    try {
      await api.post(`/admin/listings/${id}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
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
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue">
                {STATUSES.map((item) => <option key={item || "ALL"} value={item}>{item || "All statuses"}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-brand-ink">
              Search
              <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} className="mt-2" placeholder="Title, slug, designer" />
            </label>
            <div className="flex items-end"><Button onClick={load}><Search size={16} /> Search</Button></div>
          </div>
        </Card>

        {error ? <ErrorState title="Listing review issue" description={error} retry={<Button onClick={load}>Retry</Button>} /> : null}

        {loading ? (
          <Skeleton className="h-72" />
        ) : !filtered.length ? (
          <Card><EmptyState icon={<ShieldAlert className="text-brand-peach" size={32} />} title="No listings found" description="There are no listings matching the current review filters." /></Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
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
                          <Button size="sm" onClick={() => setListingStatus(item.id, "PUBLISHED")} disabled={savingId === item.id || item.status === "PUBLISHED"} loading={savingId === item.id}><CheckCircle2 size={14} /> Publish</Button>
                          <Button size="sm" variant="danger" onClick={() => setListingStatus(item.id, "REJECTED")} disabled={savingId === item.id || item.status === "REJECTED"}><XCircle size={14} /> Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value);
  return `${Number.isFinite(amount) ? amount.toLocaleString() : value} ${currency}`;
}
