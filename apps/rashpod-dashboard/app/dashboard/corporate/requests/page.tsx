"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

type CorporateRequest = { id: string; title: string; status: string; quantity: number; budget: string | null };

export default function CorporateRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CorporateRequest[]>([]);
  const [form, setForm] = useState({ title: "", details: "", quantity: "100", budget: "0" });

  const load = async () => {
    if (!user) return;
    const res = await fetch(`/api/proxy/corporate/requests`);
    if (res.ok) setRequests(await res.json());
  };
  useEffect(() => {
    void load();
  }, [user]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await fetch(`/api/proxy/corporate/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
