"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
}

function Skeleton({ w = "100%" }: { w?: string | number }) {
  return <div style={{ width: w, height: 14, borderRadius: 6, background: "#F0F2FA", margin: "4px 0" }} />;
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  low: { bg: "#F0F2FA", color: "#6B7280" },
  medium: { bg: "#FEF3C7", color: "#92400E" },
  high: { bg: "#FEE2E2", color: "#991B1B" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open: { bg: "#EEF0FB", color: "#788AE0" },
  in_progress: { bg: "#FEF3C7", color: "#92400E" },
  resolved: { bg: "#D1FAE5", color: "#065F46" },
  closed: { bg: "#F0F2FA", color: "#6B7280" },
};

export default function SupportTicketsPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/auth/login?next=/dashboard/support/tickets"); return; }

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/support/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        setTickets(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, isReady]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <DashboardLayout role="support">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Support Tickets</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "open", "in_progress", "resolved"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid", fontSize: 12, fontWeight: 500, cursor: "pointer", borderColor: filter === f ? "#788AE0" : "#E8EAFB", background: filter === f ? "#EEF0FB" : "white", color: filter === f ? "#788AE0" : "#6B7280" }}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 14, padding: "14px 18px" }}>
                <Skeleton w="40%" />
                <Skeleton w="25%" />
              </div>
            ))
          : filtered.length === 0
          ? <p style={{ color: "#9CA3AF", textAlign: "center", padding: 32 }}>No tickets found.</p>
          : filtered.map((t) => {
              const ps = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.low;
              const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.open;
              return (
                <div key={t.id} style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1D2E", marginBottom: 4 }}>{t.subject}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{t.customerName} · {new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: ps.bg, color: ps.color, textTransform: "capitalize" }}>{t.priority}</span>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color, textTransform: "capitalize" }}>{t.status.replace("_", " ")}</span>
                  </div>
                </div>
              );
            })}
      </div>
    </DashboardLayout>
  );
}
