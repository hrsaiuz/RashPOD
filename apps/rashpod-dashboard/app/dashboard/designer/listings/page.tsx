"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type Design = { id: string; title: string };
type Listing = { id: string; title: string; status: string; slug: string; price: string };

export default function DesignerListingsPage() {
  const { token } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState({ designAssetId: "", title: "", description: "", price: "0", type: "PRODUCT" });
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    const [dRes, lRes] = await Promise.all([
      fetch(`${API_URL}/designs`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/listings`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (dRes.ok) setDesigns(await dRes.json());
    if (lRes.ok) setListings(await lRes.json());
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    const res = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    if (!res.ok) {
      setError(`Create failed (${res.status})`);
      return;
    }
    await load();
  };

  return (
    <main style={{ padding: 24, maxWidth: 1000 }}>
      <h1>Designer Listings</h1>
      <form onSubmit={onCreate} style={{ display: "grid", gap: 10, background: "white", padding: 16, borderRadius: 16, border: "1px solid #E5E7EB" }}>
        <select value={form.designAssetId} onChange={(e) => setForm({ ...form, designAssetId: e.target.value })} required>
          <option value="">Select design</option>
          {designs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="PRODUCT">PRODUCT</option>
          <option value="FILM">FILM</option>
        </select>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <button type="submit">Create listing</button>
      </form>
      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
      <h2>My Listings</h2>
      <ul>
        {listings.map((l) => (
          <li key={l.id}>
            {l.title} ({l.status}) - {l.price}
          </li>
        ))}
      </ul>
    </main>
  );
}
