"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Job = { id: string; status: string; queueType: string; order: { id: string } };

const statuses = ["ORDERED", "FILE_CHECK", "READY_FOR_PRINT", "PRINTING", "QC", "PACKING", "READY_FOR_PICKUP", "DELIVERED"];

export default function ProductionJobsPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);

  const load = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/production/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setJobs(await res.json());
  };

  useEffect(() => {
    void load();
  }, [token]);

  const update = async (id: string, status: string) => {
    if (!token) return;
    await fetch(`${API_URL}/production/jobs/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Production Queue</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Order</th>
            <th style={{ textAlign: "left" }}>Queue</th>
            <th style={{ textAlign: "left" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>{j.order.id}</td>
              <td>{j.queueType}</td>
              <td>
                <select value={j.status} onChange={(e) => update(j.id, e.target.value)}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
