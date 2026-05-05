"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

interface PaymentRow {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: string;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
}

function Skeleton({ w = "100%" }: { w?: string | number }) {
  return <div style={{ width: w, height: 14, borderRadius: 6, background: "#F0F2FA", margin: "4px 0" }} />;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  completed: { bg: "#D1FAE5", color: "#065F46" },
  pending: { bg: "#FEF3C7", color: "#92400E" },
  failed: { bg: "#FEE2E2", color: "#991B1B" },
  refunded: { bg: "#EDE9FE", color: "#4C1D95" },
};

export default function FinancePaymentsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/proxy/payments`);
        if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        setRows(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="finance">
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#1A1D2E" }}>Payments</h1>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Payments table
            </caption>
            <thead>
              <tr style={{ background: "#F8F9FF" }}>
                {["Order", "Customer", "Amount", "Method", "Status", "Date"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6B7280", fontWeight: 500, borderBottom: "1px solid #E8EAFB", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} style={{ padding: "10px 16px", borderBottom: "1px solid #F0F2FA" }}>
                          <Skeleton w={j === 0 ? "80px" : "100px"} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.length === 0
                ? <tr><td colSpan={6} style={{ padding: 24, color: "#9CA3AF", textAlign: "center" }}>No payments found.</td></tr>
                : rows.map((r) => {
                    const s = STATUS_STYLE[r.status] ?? { bg: "#F0F2FA", color: "#374151" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F0F2FA" }}>
                        <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12 }}>#{r.orderId.slice(-6)}</td>
                        <td style={{ padding: "10px 16px" }}>{r.customerName}</td>
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>{r.amount.toLocaleString()} UZS</td>
                        <td style={{ padding: "10px 16px", textTransform: "capitalize" }}>{r.method}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, textTransform: "capitalize" }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", color: "#6B7280" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
