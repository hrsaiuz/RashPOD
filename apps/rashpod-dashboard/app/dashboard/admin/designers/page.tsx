"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, Input, Skeleton } from "@rashpod/ui";
import { Users } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

interface DesignerRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  _count?: { designAssets?: number; listings?: number };
}

export default function AdminDesignersPage() {
  const [rows, setRows] = useState<DesignerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const columns: DataTableColumn<DesignerRow>[] = [
    {
      key: "name",
      header: "Designer",
      render: (_value, r) => (
        <div>
          <p className="font-medium text-brand-ink">{r.name || "—"}</p>
          <p className="text-xs text-brand-muted">{r.email}</p>
        </div>
      ),
    },
    { key: "designs", header: "Designs", render: (_v, r) => r._count?.designAssets ?? 0 },
    { key: "listings", header: "Listings", render: (_v, r) => r._count?.listings ?? 0 },
    { key: "status", header: "Status", render: (_v, r) => r.status },
    {
      key: "createdAt",
      header: "Joined",
      render: (_v, r) => new Date(r.createdAt).toLocaleDateString(),
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
          <Card>
            <DataTable rows={filtered} columns={columns} mobileMode="cards" />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
