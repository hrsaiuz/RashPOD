"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";

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
    <main style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 8 }}>Marketplace Export</h1>
      <p style={{ marginTop: 0, color: "#6B7280" }}>
        Generate marketplace-ready listing payloads for manual channel publishing.
        {user ? ` Signed in as ${user.email} (${user.role}).` : ""}
      </p>
      <form onSubmit={exportNow} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #D1D5DB" }}
        >
          <option value="">ALL</option>
          <option value="PRODUCT">PRODUCT</option>
          <option value="FILM">FILM</option>
        </select>
        <button style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white" }}>
          {loading ? "Exporting..." : "Export"}
        </button>
      </form>

      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
      {data ? (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 16, padding: 12 }}>
          <p style={{ marginTop: 0 }}>
            Exported <strong>{data.total}</strong> item(s) at {data.exportedAt}
          </p>
          <pre style={{ margin: 0, overflowX: "auto" }}>{JSON.stringify(data.items.slice(0, 20), null, 2)}</pre>
        </div>
      ) : null}
    </main>
  );
}
