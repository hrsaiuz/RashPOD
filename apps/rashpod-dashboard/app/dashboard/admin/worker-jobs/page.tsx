"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";

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
      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
      const data = (await res.json()) as WorkerJob[];
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const retry = async (id: string) => {
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }
    const res = await fetch(`${API_URL}/admin/worker-jobs/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      clearSession();
      router.push("/auth/login");
      return;
    }
    if (!res.ok) {
      setError(`Retry failed (${res.status})`);
      return;
    }
    await load();
  };

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.push("/auth/login");
      return;
    }
    void load();
  }, [isReady, token]);

  return (
    <main style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ marginBottom: 8 }}>Worker Jobs</h1>
      <p style={{ marginTop: 0, color: "#6B7280" }}>
        Operations queue monitor and manual retry controls.
        {user ? ` Signed in as ${user.email} (${user.role}).` : ""}
      </p>

      <form onSubmit={load} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "10px 12px", borderRadius: 12 }}>
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input
          placeholder="Job type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #D1D5DB" }}
        />
        <button type="submit" style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white" }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.push("/auth/login");
          }}
          style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #CBD5E1", background: "white" }}
        >
          Sign out
        </button>
      </form>

      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}

      <div style={{ overflowX: "auto", background: "white", borderRadius: 16, border: "1px solid #E5E7EB" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#F8FAFC" }}>
              <th style={{ padding: 12 }}>Type</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Attempts</th>
              <th style={{ padding: 12 }}>Created</th>
              <th style={{ padding: 12 }}>Error</th>
              <th style={{ padding: 12 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                <td style={{ padding: 12 }}>{job.type}</td>
                <td style={{ padding: 12 }}>{job.status}</td>
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
