"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import { Button, Card, ErrorState, Select } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";

export default function AdminMarketplacePage() {
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const [type, setType] = useState<"" | "PRODUCT" | "FILM">("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const exportNow = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/proxy/admin/marketplace/export?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Marketplace Export</h1>
          <p className="text-brand-muted mt-1">
            Generate marketplace-ready listing payloads for manual channel publishing.
            {user ? ` Signed in as ${user.email} (${user.role}).` : ""}
          </p>
        </div>
        <Card>
          <form onSubmit={exportNow} className="flex flex-wrap gap-3">
            <Select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="">ALL</option>
          <option value="PRODUCT">PRODUCT</option>
          <option value="FILM">FILM</option>
            </Select>
            <Button variant="primaryBlue" disabled={loading}>{loading ? "Exporting..." : "Export"}</Button>
          </form>
        </Card>

        {error ? <ErrorState title="Export failed" description={error} /> : null}
        {data ? (
          <Card>
            <p className="text-sm text-brand-ink mb-3">
              Exported <strong>{data.total}</strong> item(s) at {data.exportedAt}
            </p>
            <pre className="m-0 overflow-x-auto rounded-xl bg-surface-subtle p-4 text-xs text-brand-ink">{JSON.stringify(data.items.slice(0, 20), null, 2)}</pre>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
