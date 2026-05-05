"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Listing = { id: string; slug: string; title: string; type: string; price: string };

export default function ShopPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [q, setQ] = useState("");

  const load = async (term = "") => {
    const res = await fetch(`${API_URL}/shop/listings${term ? `?q=${encodeURIComponent(term)}` : ""}`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      <h1>RashPOD Shop</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings" style={{ padding: 10, borderRadius: 12, border: "1px solid #D1D5DB", minWidth: 280 }} />
        <button onClick={() => load(q)} style={{ background: "#788AE0", color: "white", border: "none", borderRadius: 999, padding: "10px 14px" }}>
          Search
        </button>
        <Link href="/checkout" style={{ marginLeft: "auto", alignSelf: "center" }}>
          Checkout
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {items.map((l) => (
          <div key={l.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 16, padding: 12 }}>
            <h3>{l.title}</h3>
            <p>
              {l.type} · {l.price}
            </p>
            <Link href={`/product/${l.slug}`}>Open</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
