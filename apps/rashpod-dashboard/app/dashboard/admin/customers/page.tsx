"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, Input, Skeleton } from "@rashpod/ui";
import { Users, Building2 } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count?: { orders?: number; corporateRequests?: number };
}

type Tab = "retail" | "corporate";

export default function AdminCustomersPage() {
  const [tab, setTab] = useState<Tab>("retail");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void load();
  }, [tab]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url =
        tab === "corporate"
          ? "/api/proxy/admin/users/customers?corporate=true"
          : "/api/proxy/admin/users/customers";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
      const data = (await res.json()) as CustomerRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
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

  const columns: DataTableColumn<CustomerRow>[] =
    tab === "corporate"
      ? [
          {
            key: "name",
            header: "Client",
            render: (_v, r) => (
              <div>
                <p className="font-medium text-brand-ink">{r.name || "—"}</p>
                <p className="text-xs text-brand-muted">{r.email}</p>
              </div>
            ),
          },
          { key: "requests", header: "Requests", render: (_v, r) => r._count?.corporateRequests ?? 0 },
          { key: "orders", header: "Orders", render: (_v, r) => r._count?.orders ?? 0 },
          { key: "status", header: "Status", render: (_v, r) => r.status },
          {
            key: "createdAt",
            header: "Joined",
            render: (_v, r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]
      : [
          {
            key: "name",
            header: "Customer",
            render: (_v, r) => (
              <div>
                <p className="font-medium text-brand-ink">{r.name || "—"}</p>
                <p className="text-xs text-brand-muted">{r.email}</p>
              </div>
            ),
          },
          { key: "orders", header: "Orders", render: (_v, r) => r._count?.orders ?? 0 },
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
            <h1 className="text-3xl font-bold text-brand-ink">Customers</h1>
            <p className="text-brand-muted mt-1">
              Retail buyers and corporate clients. Switch tabs to see B2B accounts and their requests.
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

        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
          <button
            onClick={() => setTab("retail")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === "retail" ? "bg-brand-blue text-white" : "text-brand-muted"
            }`}
          >
            <Users size={14} className="inline mr-1" /> Retail customers
          </button>
          <button
            onClick={() => setTab("corporate")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === "corporate" ? "bg-brand-blue text-white" : "text-brand-muted"
            }`}
          >
            <Building2 size={14} className="inline mr-1" /> Corporate clients
          </button>
        </div>

        {error ? (
          <ErrorState
            title="Could not load customers"
            description={error}
            retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>}
          />
        ) : loading ? (
          <Skeleton className="h-64" />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="text-brand-peach" size={32} />}
              title={tab === "corporate" ? "No corporate clients yet" : "No customers yet"}
              description={
                tab === "corporate"
                  ? "Corporate accounts will appear once they sign up or are invited."
                  : "Customers will appear here as soon as they create accounts."
              }
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
