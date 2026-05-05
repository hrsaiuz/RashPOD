"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Order = { id: string; status: string; total: string; createdAt: string };
type CartItem = { id: string; listing: { title: string }; quantity: number };
type DeliveryOption = { id: string; providerType: string; displayName: string; zone: string };

export default function CustomerOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!token) return;
    const [oRes, cRes, dRes] = await Promise.all([
      fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/cart`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/delivery/options`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (oRes.ok) setOrders(await oRes.json());
    if (cRes.ok) {
      const cart = await cRes.json();
      setCartItems(cart.items || []);
    }
    if (dRes.ok) {
      const options = (await dRes.json()) as DeliveryOption[];
      setDeliveryOptions(options);
      if (options.length && !deliveryType) {
        setDeliveryType(options[0].providerType);
        setDeliveryZone(options[0].zone);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const checkout = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryType, deliveryZone }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(Array.isArray(body?.message) ? body.message.join(", ") : body?.message || `Checkout failed (${res.status})`);
      return;
    }
    const order = await res.json();
    const payRes = await fetch(`${API_URL}/payments/click/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    setMessage(payRes.ok ? `Order created with payment ${String((await payRes.json()).paymentId)}` : "Order created, payment init failed");
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Customer Orders</h1>
      <h2>Cart</h2>
      <ul>
        {cartItems.map((i) => (
          <li key={i.id}>
            {i.listing.title} × {i.quantity}
          </li>
        ))}
      </ul>
      <button onClick={checkout} disabled={cartItems.length === 0}>
        Checkout
      </button>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
          <option value="">Provider</option>
          {deliveryOptions.map((o) => (
            <option key={o.id} value={o.providerType}>
              {o.displayName}
            </option>
          ))}
        </select>
        <select value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value)}>
          <option value="">Zone</option>
          {[...new Set(deliveryOptions.filter((o) => (!deliveryType ? true : o.providerType === deliveryType)).map((o) => o.zone))].map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      {message ? <p>{message}</p> : null}
      <h2>Order History</h2>
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            {o.status} · {o.total} · {new Date(o.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </main>
  );
}
