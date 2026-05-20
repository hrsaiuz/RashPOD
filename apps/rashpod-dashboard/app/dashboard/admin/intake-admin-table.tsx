"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Input, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";

export type IntakeKind = "designer-applications" | "contact-messages" | "custom-order-requests";

export interface IntakeAdminTableProps {
  kind: IntakeKind;
  title: string;
  description: string;
  emptyTitle: string;
}

const STATUS_OPTIONS = ["NEW", "IN_REVIEW", "CONTACTED", "APPROVED", "REJECTED", "ARCHIVED"];

function primaryText(row: Record<string, any>) {
  return row.fullName || [row.firstName, row.lastName].filter(Boolean).join(" ") || row.displayName || "Untitled";
}

function secondaryText(row: Record<string, any>) {
  return row.email || row.phoneNumber || row.telegramUsername || "";
}

function details(row: Record<string, any>, kind: IntakeKind) {
  if (kind === "designer-applications") {
    return [row.displayName, row.country, row.city, row.shortBio].filter(Boolean).join(" · ");
  }
  if (kind === "contact-messages") {
    return [row.subject, row.message].filter(Boolean).join(" · ");
  }
  return [row.companyEventName, row.productNeed, row.quantity, row.details].filter(Boolean).join(" · ");
}

export function IntakeAdminTable({ kind, title, description, emptyTitle }: IntakeAdminTableProps) {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    void load();
  }, [kind]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/admin/intake/${kind}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function updateRow(id: string, patch: { status?: string; reviewNotes?: string }) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/proxy/admin/intake/${kind}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to update (${res.status})`);
      const updated = await res.json();
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingId("");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">{title}</h1>
          <p className="mt-1 text-brand-muted">{description}</p>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <Input className="md:w-80" placeholder="Search submissions" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="secondary" onClick={load}>Refresh</Button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title={emptyTitle} description="New public form submissions will appear here for admin review." />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <Card key={row.id}>
              <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-brand-ink">{primaryText(row)}</h2>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-sm text-brand-muted">{secondaryText(row)}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-brand-text">{details(row, kind)}</p>
                  <p className="mt-3 text-xs text-brand-muted">
                    Submitted {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="space-y-3">
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(row.id, { status: e.target.value })}
                    disabled={savingId === row.id}
                    className="w-full rounded-[14px] border border-surface-borderSoft bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/20"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                  <Textarea
                    rows={3}
                    placeholder="Admin notes"
                    defaultValue={row.reviewNotes || ""}
                    onBlur={(e) => updateRow(row.id, { reviewNotes: e.target.value })}
                    disabled={savingId === row.id}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
