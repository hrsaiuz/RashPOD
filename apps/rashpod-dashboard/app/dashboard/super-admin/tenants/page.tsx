"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import { Button, ErrorState } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tenantType: string;
  defaultCurrency: string;
  plan?: { name: string; code: string } | null;
  _count?: { members: number; orders: number; commerceListings: number };
};

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/super-admin/tenants?${params.toString()}`);
      if (res.status === 401 || res.status === 403) throw new Error("Super admin tenant access is required.");
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json() as TenantRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/super-admin/tenants");
      return;
    }
    void load();
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="super-admin">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Tenants</h1>
          <p className="text-sm text-brand-muted">Platform workspaces, plans, status, and operating counts.</p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/dashboard/super-admin/plans")}>Manage plans</Button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-soft">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-brand-line px-3 py-2">
          <Search size={16} className="text-brand-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tenants" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-brand-line bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past due</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button type="submit" loading={loading}>Refresh</Button>
      </form>

      {error ? <ErrorState title="Tenant list unavailable" description={error} /> : null}
      <div className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-soft text-left text-xs text-brand-muted">
                {["Tenant", "Plan", "Status", "Members", "Orders", "Listings"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((tenant) => (
                <tr key={tenant.id} className="border-t border-brand-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-brand-ink"><Building2 size={16} className="text-brand-blue" />{tenant.name}</div>
                    <div className="text-xs text-brand-muted">/{tenant.slug} · {tenant.tenantType} · {tenant.defaultCurrency}</div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{tenant.plan?.name ?? "No plan"}</td>
                  <td className="px-4 py-3"><span className="rounded-pill bg-brand-blue/10 px-2 py-1 text-xs font-semibold text-brand-blue">{tenant.status}</span></td>
                  <td className="px-4 py-3 text-brand-muted">{tenant._count?.members ?? 0}</td>
                  <td className="px-4 py-3 text-brand-muted">{tenant._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-brand-muted">{tenant._count?.commerceListings ?? 0}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted">No tenants found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
