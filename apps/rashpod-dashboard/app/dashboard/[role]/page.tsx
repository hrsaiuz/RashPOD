"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const router = useRouter();
  const { token, isReady, clearSession } = useAuth();
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const load = async () => {
      const res = await fetch(`${API_URL}/dashboard/${role}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        setError(`Failed to load dashboard (${res.status})`);
        return;
      }
      setData(await res.json());
    };
    void load();
  }, [role, token, isReady]);

  const links: Record<string, Array<{ href: string; label: string }>> = {
    designer: [{ href: "/dashboard/designer/listings", label: "Manage Listings" }],
    customer: [
      { href: "/dashboard/customer/shop", label: "Browse Shop" },
      { href: "/dashboard/customer/orders", label: "My Orders" },
    ],
    production: [{ href: "/dashboard/production/jobs", label: "Production Queue" }],
    corporate: [{ href: "/dashboard/corporate/requests", label: "Corporate Requests" }],
    moderator: [{ href: "/dashboard/moderator/designs", label: "Moderation Queue" }],
    admin: [
      { href: "/dashboard/admin/orders", label: "Orders" },
      { href: "/dashboard/admin/delivery-settings", label: "Delivery Settings" },
      { href: "/dashboard/admin/corporate", label: "Corporate" },
      { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs" },
    ],
  };

  return (
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ textTransform: "capitalize", marginBottom: 6 }}>{role} dashboard</h1>
      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
      {data ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginTop: 12 }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 16, padding: 14 }}>
              <div style={{ color: "#6B7280", fontSize: 13 }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <p>Loading...</p>
      )}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(links[role] || []).map((l) => (
          <Link key={l.href} href={l.href} style={{ padding: "10px 14px", background: "#788AE0", color: "white", borderRadius: 999, textDecoration: "none" }}>
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
