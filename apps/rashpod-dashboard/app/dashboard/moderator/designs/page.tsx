"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Design = { id: string; title: string; status: string };

export default function ModeratorDesignsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Design[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/moderation/designs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError(`Failed to load queue (${res.status})`);
      return;
    }
    setItems(await res.json());
  };

  useEffect(() => {
    void load();
  }, [token]);

  const decide = async (id: string, action: "approve" | "reject" | "request-changes") => {
    if (!token) return;
    await fetch(`${API_URL}/moderation/designs/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: action !== "approve" ? "Moderator action" : undefined }),
    });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Moderator Queue</h1>
      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
      <ul>
        {items.map((d) => (
          <li key={d.id} style={{ marginBottom: 10 }}>
            {d.title} ({d.status}){" "}
            <button onClick={() => decide(d.id, "approve")}>Approve</button>{" "}
            <button onClick={() => decide(d.id, "request-changes")}>Need Fix</button>{" "}
            <button onClick={() => decide(d.id, "reject")}>Reject</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
