"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type CorporateRequest = { id: string; title: string; status: string; quantity: number; budget: string | null };

export default function CorporateRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<CorporateRequest[]>([]);
  const [form, setForm] = useState({ title: "", details: "", quantity: "100", budget: "0" });

  const load = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/corporate/requests`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRequests(await res.json());
  };
  useEffect(() => {
    void load();
  }, [token]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await fetch(`${API_URL}/corporate/requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        details: form.details,
        quantity: Number(form.quantity),
        budget: Number(form.budget),
      }),
    });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Corporate Requests</h1>
      <form onSubmit={create} style={{ display: "grid", gap: 10, maxWidth: 620 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea placeholder="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        <input placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        <button type="submit">Create request</button>
      </form>
      <h2>My Requests</h2>
      <ul>
        {requests.map((r) => (
          <li key={r.id}>
            {r.title} · {r.status} · qty {r.quantity}
          </li>
        ))}
      </ul>
    </main>
  );
}
