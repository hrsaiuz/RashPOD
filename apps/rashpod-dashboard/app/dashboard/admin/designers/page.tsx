"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, FormField, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import { Gift, Users } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

interface DesignerRow {
  id: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lifetimeEarningsUzs?: number;
  createdAt: string;
  _count?: { designAssets?: number; listings?: number };
  designsCount?: number;
  listingsCount?: number;
}

export default function AdminDesignersPage() {
  const [rows, setRows] = useState<DesignerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bonusAmount, setBonusAmount] = useState("50000");
  const [bonusReason, setBonusReason] = useState("Designer performance bonus");
  const [savingBonus, setSavingBonus] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/admin/users/designers");
      if (!res.ok) throw new Error(`Failed to load designers (${res.status})`);
      const data = (await res.json()) as DesignerRow[];
      setRows(Array.isArray(data) ? data : []);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designers");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.email.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function updateStatus(id: string, status: DesignerRow["status"]) {
    setError("");
    const res = await fetch(`/api/proxy/admin/users/designers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason: `Admin changed designer status to ${status}` }),
    });
    if (!res.ok) {
      setError(`Status update failed (${res.status})`);
      return;
    }
    await load();
  }

  async function grantGroupBonus() {
    if (!selected.length) return;
    setSavingBonus(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/admin/users/designers/group-bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerIds: selected, amount: Number(bonusAmount), currency: "UZS", reason: bonusReason }),
      });
      if (!res.ok) throw new Error(`Group bonus failed (${res.status})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Group bonus failed");
    } finally {
      setSavingBonus(false);
    }
  }

  const columns: DataTableColumn<DesignerRow>[] = [
    {
      key: "name",
      header: "Designer",
      render: (_value, r) => (
        <div className="flex items-start gap-3">
          <input className="mt-1" type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelected(r.id)} aria-label={`Select ${r.email}`} />
          <div>
          <p className="font-medium text-brand-ink">{r.name || r.displayName || "-"}</p>
          <p className="text-xs text-brand-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: "designs", header: "Designs", render: (_v, r) => r._count?.designAssets ?? r.designsCount ?? 0 },
    { key: "listings", header: "Listings", render: (_v, r) => r._count?.listings ?? r.listingsCount ?? 0 },
    { key: "earnings", header: "Income", render: (_v, r) => `${Number(r.lifetimeEarningsUzs ?? 0).toLocaleString()} UZS` },
    { key: "status", header: "Status", render: (_v, r) => <StatusBadge status={r.status} /> },
    {
      key: "createdAt",
      header: "Joined",
      render: (_v, r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_v, r) => (
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/admin/designers/${r.id}`}><Button size="sm" variant="secondary">Open</Button></Link>
          <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
            {r.status === "ACTIVE" ? "Inactivate" : "Reactivate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Designers</h1>
            <p className="text-brand-muted mt-1">
              Creators with `DESIGNER` role. Manage status, view portfolio activity, and access compliance details.
            </p>
          </div>
          <div className="w-full md:w-80">
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Could not load designers"
            description={error}
            retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>}
          />
        ) : loading ? (
          <Skeleton className="h-64" />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="text-brand-peach" size={32} />}
              title="No designers yet"
              description="Once creators sign up with the DESIGNER role, they'll appear here."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <div className="flex items-center gap-2 text-brand-ink font-semibold"><Gift size={18} /> Group bonus</div>
                <FormField label="Amount" className="lg:w-40"><Input value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} /></FormField>
                <FormField label="Reason" className="flex-1"><Input value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} /></FormField>
                <Button variant="primaryBlue" loading={savingBonus} disabled={!selected.length} onClick={grantGroupBonus}>
                  Bonus {selected.length} selected
                </Button>
              </div>
            </Card>
            <Card>
              <DataTable rows={filtered} columns={columns} mobileMode="cards" />
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
