"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

const VALID_ROLES = new Set(["designer", "customer", "production", "corporate", "moderator", "finance", "support", "admin", "super-admin"]);

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: "16px 20px", boxShadow: "0 1px 4px rgba(120,138,224,0.06)" }}>
      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1A1D2E" }}>{value.toLocaleString()}</div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: "16px 20px" }}>
      <div style={{ height: 12, borderRadius: 6, background: "#F0F2FA", marginBottom: 10, width: "60%" }} />
      <div style={{ height: 32, borderRadius: 8, background: "#F0F2FA", width: "40%" }} />
    </div>
  );
}

export default function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!VALID_ROLES.has(role)) {
    notFound();
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/${role}`);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/proxy/dashboard/${role}`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/auth/login?next=/dashboard/${role}`);
          return;
        }
        if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role, user, authLoading, router]);

  return (
    <DashboardLayout role={role}>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#1A1D2E", textTransform: "capitalize" }}>
        {role.replace("-", " ")} overview
      </h1>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>
          {error}
          <button onClick={() => window.location.reload()} style={{ marginLeft: 12, background: "none", border: "none", color: "#788AE0", cursor: "pointer", fontWeight: 500, padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : data && Object.keys(data).length > 0
          ? Object.entries(data).map(([k, v]) => <StatCard key={k} label={k} value={v} />)
          : !error && (
              <p style={{ color: "#9CA3AF", fontSize: 14, gridColumn: "1/-1" }}>No data available yet.</p>
            )}
      </div>
    </DashboardLayout>
  );
}
