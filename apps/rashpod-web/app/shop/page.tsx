"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Listing = { id: string; slug: string; title: string; type: string; price: string };

function SkeletonCard() {
  return (
    <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: 12, animation: "pulse 1.5s ease-in-out infinite" }}>
      <div style={{ height: 140, borderRadius: 10, background: "#F0F2FA", marginBottom: 10 }} />
      <div style={{ height: 14, borderRadius: 6, background: "#F0F2FA", marginBottom: 6, width: "70%" }} />
      <div style={{ height: 12, borderRadius: 6, background: "#F0F2FA", width: "45%" }} />
    </div>
  );
}

export default function ShopPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (term = "", sortBy = sort) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (sortBy) params.set("sort", sortBy);
      const res = await fetch(`${API_URL}/shop/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
      setItems(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, sort);
  };

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ margin: "0 0 20px", color: "#1A1D2E" }}>RashPOD Shop</h1>

      <form onSubmit={onSearch} style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings…"
          aria-label="Search listings"
          style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, minWidth: 0 }}
        />
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); void load(q, e.target.value); }}
          aria-label="Sort by"
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, background: "white" }}
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
        <button type="submit" style={{ background: "#788AE0", color: "white", border: "none", borderRadius: 999, padding: "10px 20px", fontWeight: 500, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
          Search
        </button>
        <Link href="/checkout" style={{ marginLeft: "auto", alignSelf: "center", color: "#788AE0", fontWeight: 500, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
          🛒 Cart
        </Link>
      </form>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>
          {error}{" "}
          <button onClick={() => void load(q)} style={{ background: "none", border: "none", color: "#788AE0", cursor: "pointer", fontWeight: 500, padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.length === 0 && !error
          ? null
          : items.map((l) => (
              <Link key={l.id} href={`/product/${l.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: 12, boxShadow: "0 1px 4px rgba(120,138,224,0.06)", transition: "box-shadow 0.15s", cursor: "pointer" }}>
                  <div style={{ height: 140, borderRadius: 10, background: "#F0F2FA", marginBottom: 10 }} />
                  <h3 style={{ margin: "0 0 4px", fontSize: 14, color: "#1A1D2E", fontWeight: 600 }}>{l.title}</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{l.type} · {l.price}</p>
                </div>
              </Link>
            ))}
      </div>

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
          <p style={{ color: "#6B7280", fontSize: 15 }}>No listings found{q ? ` for "${q}"` : ""}.</p>
          {q && (
            <button onClick={() => { setQ(""); void load(""); }} style={{ marginTop: 8, background: "none", border: "none", color: "#788AE0", cursor: "pointer", fontWeight: 500 }}>
              Clear search
            </button>
          )}
        </div>
      )}
    </main>
  );
}
