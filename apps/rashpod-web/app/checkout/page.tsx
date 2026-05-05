"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type CartItem = { id: string; quantity: number; listing: { title: string }; unitPrice: string };
type DeliveryOption = { id: string; providerType: string; displayName: string; zone: string; etaText?: string };

const INPUT = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" as const };
const LABEL = { fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" } as const;
const SELECT = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, background: "white", boxSizing: "border-box" as const };

type Step = "cart" | "address" | "confirm" | "done";

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>("cart");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  const authFetch = (url: string, init?: RequestInit) =>
    fetch(url, { ...init, credentials: "include" });

  const parseError = async (res: Response) => {
    try {
      const body = await res.json();
      if (Array.isArray(body?.message)) return body.message.join(", ");
      return body?.message || `Request failed (${res.status})`;
    } catch { return `Request failed (${res.status})`; }
  };

  const loadCart = async () => {
    setCartLoading(true);
    const res = await authFetch(`${API_URL}/cart`);
    if (res.ok) {
      const data = await res.json();
      setCartItems(data.items || []);
      setSubtotal(data.subtotal || 0);
    }
    setCartLoading(false);
  };

  const loadDeliveryOptions = async () => {
    const res = await authFetch(`${API_URL}/delivery/options`);
    if (!res.ok) return;
    const data = (await res.json()) as DeliveryOption[];
    setDeliveryOptions(data);
    if (data.length) { setDeliveryType(data[0].providerType); setDeliveryZone(data[0].zone); }
  };

  const quoteDelivery = async () => {
    if (!deliveryType || !deliveryZone) return;
    const res = await authFetch(`${API_URL}/delivery/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerType: deliveryType, zone: deliveryZone, subtotal }),
    });
    if (res.ok) { const d = await res.json(); setDeliveryFee(Number(d.deliveryPrice || 0)); }
  };

  useEffect(() => { void loadCart(); void loadDeliveryOptions(); }, []);
  useEffect(() => { void quoteDelivery(); }, [subtotal, deliveryType, deliveryZone]);

  const placeOrder = async () => {
    setLoading(true);
    setMessage("");
    try {
      const orderRes = await authFetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryType, deliveryZone, shippingAddress: { fullName, phone, address } }),
      });
      if (!orderRes.ok) { setMessage(await parseError(orderRes)); return; }
      const order = await orderRes.json();
      setOrderId(order.id);
      const payRes = await authFetch(`${API_URL}/payments/click/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!payRes.ok) { setMessage("Order placed, but payment link failed. Contact support."); setStep("done"); return; }
      setStep("done");
    } catch { setMessage("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  if (step === "done") {
    return (
      <main style={{ maxWidth: 520, margin: "64px auto", padding: "0 16px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h1 style={{ color: "#1A1D2E" }}>Order placed!</h1>
        <p style={{ color: "#6B7280" }}>Order #{orderId}. You'll receive a confirmation email shortly.</p>
        {message && <p style={{ color: "#B42318", fontSize: 13 }}>{message}</p>}
        <Link href="/shop" style={{ display: "inline-block", marginTop: 16, background: "#788AE0", color: "white", padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}>
          Back to shop
        </Link>
      </main>
    );
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #E8EAFB", marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "#1A1D2E" }}>{title}</h2>
      {children}
    </div>
  );

  const filteredZones = deliveryOptions.filter((o) => !deliveryType || o.providerType === deliveryType);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <Link href="/shop" style={{ color: "#788AE0", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>← Back to shop</Link>
      <h1 style={{ margin: "0 0 24px", color: "#1A1D2E" }}>Checkout</h1>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["cart", "address", "confirm"] as Step[]).map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <div style={{ width: 24, height: 1, background: "#E8EAFB" }} />}
            <span style={{ fontSize: 12, fontWeight: 500, color: step === s ? "#788AE0" : "#9CA3AF" }}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Step: Cart */}
      {step === "cart" && (
        <>
          <Section title="Your cart">
            {cartLoading ? (
              <p style={{ color: "#9CA3AF", fontSize: 14 }}>Loading cart…</p>
            ) : cartItems.length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>Your cart is empty. <Link href="/shop" style={{ color: "#788AE0" }}>Browse the shop</Link></p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {cartItems.map((i) => (
                  <li key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151" }}>
                    <span>{i.listing.title} × {i.quantity}</span>
                    <span style={{ fontWeight: 500 }}>{i.unitPrice}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Delivery">
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label htmlFor="provider" style={LABEL}>Delivery provider</label>
                <select id="provider" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} style={SELECT}>
                  <option value="">Select provider</option>
                  {[...new Set(deliveryOptions.map((o) => o.providerType))].map((t) => (
                    <option key={t} value={t}>{deliveryOptions.find((o) => o.providerType === t)?.displayName || t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="zone" style={LABEL}>Zone</label>
                <select id="zone" value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value)} style={SELECT}>
                  <option value="">Select zone</option>
                  {[...new Set(filteredZones.map((o) => o.zone))].map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #E8EAFB", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6B7280", marginBottom: 6 }}>
              <span>Subtotal</span><span>{subtotal} UZS</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6B7280", marginBottom: 12 }}>
              <span>Delivery</span><span>{deliveryFee} UZS</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1A1D2E" }}>
              <span>Total</span><span>{subtotal + deliveryFee} UZS</span>
            </div>
          </div>

          <button disabled={cartItems.length === 0 || !deliveryType || !deliveryZone} onClick={() => setStep("address")} style={{ width: "100%", padding: "14px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: (cartItems.length === 0 || !deliveryType || !deliveryZone) ? 0.5 : 1 }}>
            Continue to address →
          </button>
        </>
      )}

      {/* Step: Address */}
      {step === "address" && (
        <>
          <Section title="Contact & delivery address">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label htmlFor="fullName" style={LABEL}>Full name</label>
                <input id="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={INPUT} required />
              </div>
              <div>
                <label htmlFor="phone" style={LABEL}>Phone number</label>
                <input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={INPUT} required />
              </div>
              <div>
                <label htmlFor="address" style={LABEL}>Delivery address</label>
                <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical" }} required />
              </div>
            </div>
          </Section>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("cart")} style={{ flex: 1, padding: "13px 16px", borderRadius: 999, border: "1px solid #D1D5DB", background: "white", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
              ← Back
            </button>
            <button disabled={!fullName || !phone || !address} onClick={() => setStep("confirm")} style={{ flex: 2, padding: "13px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: (!fullName || !phone || !address) ? 0.5 : 1 }}>
              Review order →
            </button>
          </div>
        </>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <>
          <Section title="Order summary">
            <ul style={{ margin: "0 0 12px", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {cartItems.map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151" }}>
                  <span>{i.listing.title} × {i.quantity}</span><span>{i.unitPrice}</span>
                </li>
              ))}
            </ul>
            <div style={{ borderTop: "1px solid #F0F2FA", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1A1D2E" }}>
              <span>Total</span><span>{subtotal + deliveryFee} UZS</span>
            </div>
          </Section>
          <Section title="Delivery details">
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151" }}><strong>{fullName}</strong> · {phone}</p>
            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>{address}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9CA3AF" }}>{deliveryType} · {deliveryZone}</p>
          </Section>
          {message && <p role="alert" style={{ color: "#B42318", fontSize: 13, marginBottom: 12 }}>{message}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("address")} style={{ flex: 1, padding: "13px 16px", borderRadius: 999, border: "1px solid #D1D5DB", background: "white", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
              ← Back
            </button>
            <button disabled={loading} onClick={placeOrder} style={{ flex: 2, padding: "13px 16px", borderRadius: 999, border: "none", background: "#F39E7C", color: "white", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Placing order…" : "Place order & pay"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
