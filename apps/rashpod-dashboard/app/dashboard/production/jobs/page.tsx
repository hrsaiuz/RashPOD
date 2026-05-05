"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Job = { id: string; status: string; queueType: string; order: { id: string } };

const STATUSES = ["ORDERED", "FILE_CHECK", "READY_FOR_PRINT", "PRINTING", "QC", "PACKING", "READY_FOR_PICKUP", "DELIVERED"];

const STATUS_COLOR: Record<string, string> = {
  ORDERED: "#EEF0FB", FILE_CHECK: "#FEF3C7", READY_FOR_PRINT: "#FEF3C7",
  PRINTING: "#DBEAFE", QC: "#EDE9FE", PACKING: "#FCE7F3",
  READY_FOR_PICKUP: "#D1FAE5", DELIVERED: "#F0F2FA",
};

function Skeleton() {
  return (
    <tr>
      {[1, 2, 3].map((i) => (
        <td key={i} style={{ padding: "10px 16px", borderBottom: "1px solid #F0F2FA" }}>
          <div style={{ height: 14, borderRadius: 6, background: "#F0F2FA", width: i === 1 ? 80 : 100 }} />
        </td>
      ))}
    </tr>
  );
}

export default function ProductionJobsPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/production/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setJobs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/auth/login?next=/dashboard/production/jobs"); return; }
    void load();
  }, [token, isReady]);

  const update = async (id: string, status: string) => {
    if (!token) return;
    setUpdating(id);
    try {
      const res = await fetch(`${API_URL}/production/jobs/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j));
    } catch {
      setError("Failed to update job status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <DashboardLayout role="production">
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#1A1D2E" }}>Production Queue</h1>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>
          {error}
          <button onClick={load} style={{ marginLeft: 12, background: "none", border: "none", color: "#788AE0", cursor: "pointer", fontWeight: 500, padding: 0 }}>Retry</button>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Production job queue
            </caption>
            <thead>
              <tr style={{ background: "#F8F9FF" }}>
                {["Order ID", "Queue Type", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6B7280", fontWeight: 500, borderBottom: "1px solid #E8EAFB" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
                : jobs.length === 0
                ? <tr><td colSpan={3} style={{ padding: 24, color: "#9CA3AF", textAlign: "center" }}>No jobs in queue.</td></tr>
                : jobs.map((j) => (
                    <tr key={j.id} style={{ borderBottom: "1px solid #F0F2FA" }}>
                      <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "#374151" }}>#{j.order.id.slice(-6)}</td>
                      <td style={{ padding: "10px 16px", textTransform: "uppercase", fontSize: 11, fontWeight: 600, color: "#788AE0" }}>{j.queueType}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <label htmlFor={`status-${j.id}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                          Status for order {j.order.id.slice(-6)}
                        </label>
                        <select
                          id={`status-${j.id}`}
                          value={j.status}
                          disabled={updating === j.id}
                          onChange={(e) => void update(j.id, e.target.value)}
                          style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #E8EAFB", background: STATUS_COLOR[j.status] ?? "#F0F2FA", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: updating === j.id ? 0.6 : 1 }}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

