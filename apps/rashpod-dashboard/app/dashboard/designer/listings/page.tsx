"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type Design = { id: string; title: string };
type Listing = { id: string; title: string; status: string; slug: string; price: string };

export default function DesignerListingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [form, setForm] = useState({ designAssetId: "", title: "", description: "", price: "0", type: "PRODUCT" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [dRes, lRes] = await Promise.all([
      fetch(`/api/proxy/designs`),
      fetch(`/api/proxy/listings`),
    ]);
    if (dRes.ok) setDesigns(await dRes.json() as Design[]);
    if (lRes.ok) setListings(await lRes.json() as Listing[]);
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading, router]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setForm({ designAssetId: "", title: "", description: "", price: "0", type: "PRODUCT" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { padding: "9px 12px", borderRadius: 10, border: "1px solid #E8EAFB", fontSize: 13, width: "100%", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" } as const;

  return (
    <DashboardLayout role="designer">
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#1A1D2E" }}>My Listings</h1>

      <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#1A1D2E" }}>Create new listing</h2>
        <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
          <div>
            <label htmlFor="listing-design" style={labelStyle}>Design</label>
            <select id="listing-design" value={form.designAssetId} onChange={(e) => setForm({ ...form, designAssetId: e.target.value })} required style={inputStyle}>
              <option value="">Select design…</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="listing-type" style={labelStyle}>Type</label>
            <select id="listing-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="PRODUCT">PRODUCT</option>
              <option value="FILM">FILM</option>
            </select>
          </div>
          <div>
            <label htmlFor="listing-title" style={labelStyle}>Title</label>
            <input id="listing-title" placeholder="Listing title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="listing-desc" style={labelStyle}>Description</label>
            <input id="listing-desc" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="listing-price" style={labelStyle}>Price (UZS)</label>
            <input id="listing-price" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required style={inputStyle} />
          </div>
          {error && <p role="alert" style={{ margin: 0, color: "#B42318", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 13, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, alignSelf: "flex-start" }}>
            {submitting ? "Creating…" : "Create listing"}
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: 16, color: "#1A1D2E", marginBottom: 12 }}>My listings</h2>
      {listings.length === 0 ? (
        <p style={{ color: "#9CA3AF", fontSize: 14 }}>No listings yet. Create your first one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listings.map((l) => (
            <div key={l.id} style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1D2E" }}>{l.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{l.price} UZS</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: l.status === "ACTIVE" ? "#D1FAE5" : "#FEF3C7", color: l.status === "ACTIVE" ? "#065F46" : "#92400E" }}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

