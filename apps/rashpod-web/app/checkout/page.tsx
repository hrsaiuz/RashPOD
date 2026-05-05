"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type CartItem = { id: string; quantity: number; listing: { title: string }; unitPrice: string };
type DeliveryOption = { id: string; providerType: string; displayName: string; zone: string; etaText?: string };

export default function CheckoutPage() {
  const [token, setToken] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [message, setMessage] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem("rashpod_dashboard_token") || "";
    setToken(saved);
  }, []);

  const loadCart = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/cart`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setMessage(`Failed to load cart (${res.status})`);
      return;
    }
    const data = await res.json();
    setCartItems(data.items || []);
    setSubtotal(data.subtotal || 0);
  };

  const parseError = async (res: Response) => {
    try {
      const body = await res.json();
      if (Array.isArray(body?.message)) return body.message.join(", ");
      return body?.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  };

  const loadDeliveryOptions = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/delivery/options`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = (await res.json()) as DeliveryOption[];
    setDeliveryOptions(data);
    if (data.length && !deliveryType) {
      setDeliveryType(data[0].providerType);
      setDeliveryZone(data[0].zone);
    }
  };

  const quoteDelivery = async (nextSubtotal = subtotal) => {
    if (!token || !deliveryType || !deliveryZone) return;
    const res = await fetch(`${API_URL}/delivery/quote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ providerType: deliveryType, zone: deliveryZone, subtotal: nextSubtotal }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setDeliveryFee(Number(data.deliveryPrice || 0));
  };

  useEffect(() => {
    if (token) {
      void loadCart();
      void loadDeliveryOptions();
    }
  }, [token]);

  useEffect(() => {
    if (token) void quoteDelivery();
  }, [token, subtotal, deliveryType, deliveryZone]);

  const checkout = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryType, deliveryZone }),
    });
    if (!res.ok) {
      setMessage(await parseError(res));
      return;
    }
    const order = await res.json();
    const payRes = await fetch(`${API_URL}/payments/click/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    if (!payRes.ok) {
      setMessage("Order created, but payment link generation failed.");
      await loadCart();
      return;
    }
    const payment = await payRes.json();
    setMessage(`Order created. Click payment initialized: ${payment.paymentId}`);
    await loadCart();
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>Checkout</h1>
      <p style={{ color: "#6B7280" }}>
        Use a logged-in token. For now this page reuses the dashboard session token from localStorage.
      </p>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Bearer token"
        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #D1D5DB" }}
      />
      <button onClick={loadCart} style={{ marginTop: 10 }}>
        Refresh cart
      </button>
      <ul>
        {cartItems.map((i) => (
          <li key={i.id}>
            {i.listing.title} × {i.quantity} ({i.unitPrice})
          </li>
        ))}
      </ul>
      <p>Subtotal: {subtotal}</p>
      <p>Delivery fee: {deliveryFee}</p>
      <p>Total: {subtotal + deliveryFee}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
          <option value="">Select provider</option>
          {deliveryOptions.map((o) => (
            <option key={o.id} value={o.providerType}>
              {o.displayName}
            </option>
          ))}
        </select>
        <select value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value)}>
          <option value="">Select zone</option>
          {[...new Set(deliveryOptions.filter((o) => (!deliveryType ? true : o.providerType === deliveryType)).map((o) => o.zone))].map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      <button disabled={cartItems.length === 0} onClick={checkout}>
        Create order
      </button>
      {message ? <p>{message}</p> : null}
    </main>
  );
}
