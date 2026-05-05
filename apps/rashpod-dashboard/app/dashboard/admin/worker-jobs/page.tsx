"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type WorkerJob = {
  id: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#FEF3C7", color: "#92400E" },
  PROCESSING: { bg: "#DBEAFE", color: "#1E40AF" },
  COMPLETED: { bg: "#D1FAE5", color: "#065F46" },
  FAILED: { bg: "#FEE2E2", color: "#991B1B" },
};

export default function AdminWorkerJobsPage() {
  const router = useRouter();
  const { token, isReady, user, clearSession } = useAuth();
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const load = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      const res = await fetch(`${API_URL}/admin/worker-jobs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) { clearSession(); router.push("/auth/login"); return; }
      if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
      setJobs(await res.json() as WorkerJob[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const retry = async (id: string) => {
    if (!token) { setError("Session expired."); return; }
    const res = await fetch(`${API_URL}/admin/worker-jobs/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) { clearSession(); router.push("/auth/login"); return; }
    if (!res.ok) { setError(`Retry failed (${res.status})`); return; }
    await load();
  };

  useEffect(() => {
    if (!isReady) return;
    if (!token) { router.push("/auth/login"); return; }
    void load();
  }, [isReady, token]);

  return (
    <DashboardLayout role="admin">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Worker Jobs</h1>
          <p style={{ marginTop: 4, color: "#6B7280", fontSize: 13 }}>
            Operations queue monitor and manual retry.{user ? ` Signed in as ${user.email}.` : ""}
          </p>
        </div>
      </div>

      <form onSubmit={load} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }} role="search" aria-label="Filter worker jobs">
        <div>
          <label htmlFor="wj-status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Status filter</label>
          <select id="wj-status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid #E8EAFB", background: "white", fontSize: 13 }}>
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
        <div>
          <label htmlFor="wj-type" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Job type filter</label>
          <input id="wj-type" placeholder="Job type" value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid #E8EAFB", fontSize: 13 }} />
        </div>
        <button type="submit" style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </form>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 14, marginBottom: 16, color: "#B42318", fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #E8EAFB", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Worker jobs list</caption>
            <thead>
              <tr style={{ textAlign: "left", background: "#F8F9FF" }}>
                {["Type", "Status", "Attempts", "Created", "Error", "Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontWeight: 500, color: "#6B7280", borderBottom: "1px solid #E8EAFB", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 24, color: "#9CA3AF", textAlign: "center" }}>No jobs found.</td></tr>
              ) : (
                jobs.map((job) => {
                  const ss = STATUS_STYLE[job.status] ?? { bg: "#F0F2FA", color: "#374151" };
                  return (
                    <tr key={job.id} style={{ borderTop: "1px solid #F0F2FA" }}>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>{job.type}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>{job.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{job.attempts}/{job.maxAttempts}</td>
                      <td style={{ padding: "10px 14px", color: "#6B7280" }}>{new Date(job.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6B7280" }} title={job.errorMessage ?? ""}>{job.errorMessage || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => void retry(job.id)}
                          disabled={job.status !== "FAILED"}
                          aria-label={`Retry job ${job.id}`}
                          style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: job.status === "FAILED" ? "#F39E7C" : "#E8EAFB", color: job.status === "FAILED" ? "white" : "#9CA3AF", cursor: job.status === "FAILED" ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 12 }}>
                          Retry
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

                <td style={{ padding: 12 }}>
                  {job.attempts}/{job.maxAttempts}
                </td>
                <td style={{ padding: 12 }}>{new Date(job.createdAt).toLocaleString()}</td>
                <td style={{ padding: 12, maxWidth: 280 }}>{job.errorMessage || "-"}</td>
                <td style={{ padding: 12 }}>
                  <button
                    onClick={() => retry(job.id)}
                    disabled={job.status !== "FAILED"}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "none",
                      background: job.status === "FAILED" ? "#F39E7C" : "#CBD5E1",
                      color: "white",
                      cursor: job.status === "FAILED" ? "pointer" : "not-allowed",
                    }}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "#6B7280" }}>
                  No jobs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
