"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

type Design = { id: string; title: string; status: string };

export default function ModeratorDesignsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Design[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user) return;
    const res = await fetch(`/api/proxy/moderation/designs`);
    if (!res.ok) {
      setError(`Failed to load queue (${res.status})`);
      return;
    }
    setItems(await res.json());
  };

  useEffect(() => {
    void load();
  }, [user]);

  const decide = async (id: string, action: "approve" | "reject" | "request-changes") => {
    if (!user) return;
    await fetch(`/api/proxy/moderation/designs/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
