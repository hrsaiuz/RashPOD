"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

type AdminOrder = { id: string; status: string; total: string; customer: { email: string } };

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  const load = async () => {
    if (!user) return;
    const res = await fetch(`/api/proxy/admin/orders`);
    if (res.ok) setOrders(await res.json());
  };

  useEffect(() => {
    void load();
  }, [user]);

  const markPaid = async (id: string) => {
    if (!user) return;
    await fetch(`/api/proxy/admin/orders/${id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerRef: `manual-${Date.now()}` }),
    });
    await load();
  };

  const createShipment = async (id: string) => {
    if (!user) return;
    await fetch(`/api/proxy/delivery/create-shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });
    await load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Orders</h1>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Order</th>
            <th style={{ textAlign: "left" }}>Customer</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "left" }}>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.customer?.email}</td>
              <td>{o.status}</td>
              <td>{o.total}</td>
              <td>
                <button onClick={() => markPaid(o.id)} disabled={o.status === "PAID"}>
                  Mark paid
                </button>
                <button onClick={() => createShipment(o.id)} style={{ marginLeft: 8 }}>
                  Create shipment
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
