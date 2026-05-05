"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type ShopListing = { id: string; title: string; type: string; price: string; slug: string };

export default function CustomerShopPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const load = async () => {
    const sRes = await fetch(`${API_URL}/shop/listings`);
    if (sRes.ok) setListings(await sRes.json());
    if (user) {
      const cRes = await fetch(`/api/proxy/cart`);
      if (cRes.ok) {
        const cart = await cRes.json();
        setCartCount(cart.items?.length || 0);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const add = async (listingId: string) => {
    if (!user) return;
    await fetch(`/api/proxy/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, quantity: 1 }),
    });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Shop</h1>
      <p>Cart items: {cartCount}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {listings.map((l) => (
          <div key={l.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 16, padding: 12 }}>
            <h3>{l.title}</h3>
            <p>
              {l.type} · {l.price}
            </p>
            <button onClick={() => add(l.id)}>Add to cart</button>
          </div>
        ))}
      </div>
    </main>
  );
}
