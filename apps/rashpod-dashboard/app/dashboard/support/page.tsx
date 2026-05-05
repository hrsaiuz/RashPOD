"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import Link from "next/link";

export default function SupportPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const [stats, setStats] = useState<{ open: number; inProgress: number; resolved: number } | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/auth/login?next=/dashboard/support"); return; }
    fetch(`${API_URL}/support/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats(d))
      .catch(() => null);
  }, [token, isReady]);

  return (
    <DashboardLayout role="support">
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#1A1D2E" }}>Support Overview</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Open", key: "open", color: "#EEF0FB" },
          { label: "In Progress", key: "inProgress", color: "#FEF3C7" },
          { label: "Resolved", key: "resolved", color: "#D1FAE5" },
        ].map(({ label, key, color }) => (
          <div key={key} style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: "16px 20px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", marginBottom: 8 }} />
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#1A1D2E" }}>
              {stats ? (stats as Record<string, number>)[key] ?? 0 : "—"}
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard/support/tickets" style={{ display: "inline-block", padding: "10px 20px", background: "#788AE0", color: "white", borderRadius: 999, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
        View Tickets →
      </Link>
    </DashboardLayout>
  );
}
