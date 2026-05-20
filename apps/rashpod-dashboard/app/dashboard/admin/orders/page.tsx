"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Package } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

type AdminOrder = { id: string; status: string; total: string; currency?: string; customer: { email: string } };

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
    const res = await fetch(`/api/proxy/admin/orders`);
      if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
      setOrders(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const markPaid = async (id: string) => {
    if (!user) return;
    const res = await fetch(`/api/proxy/admin/orders/${id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerRef: `manual-${Date.now()}` }),
    });
    if (!res.ok) setError(`Mark paid failed (${res.status})`);
    await load();
  };

  const createShipment = async (id: string) => {
    if (!user) return;
    const res = await fetch(`/api/proxy/delivery/create-shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });
    if (!res.ok) setError(`Shipment creation failed (${res.status})`);
    await load();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Orders</h1>
            <p className="text-brand-muted mt-1">Review order status, confirm manual payments, and start shipment work.</p>
          </div>
          <Button variant="secondary" onClick={load}>Refresh</Button>
        </div>

        {error ? <ErrorState title="Could not load orders" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} /> : null}

        {loading ? (
          <Skeleton className="h-64" />
        ) : orders.length === 0 ? (
          <Card>
            <EmptyState icon={<Package className="text-brand-peach" size={32} />} title="No orders yet" description="Paid and pending customer orders will appear here." />
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle text-brand-muted">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Order</th>
                    <th className="px-5 py-3 text-left font-semibold">Customer</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Total</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-borderSoft">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-mono text-xs text-brand-ink">#{order.id.slice(-8)}</td>
                      <td className="px-5 py-4 text-brand-ink">{order.customer?.email ?? "-"}</td>
                      <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                      <td className="px-5 py-4 font-semibold text-brand-ink">{Number(order.total).toLocaleString()} {order.currency ?? "UZS"}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => markPaid(order.id)} disabled={order.status === "PAID"}>
                            Mark paid
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => createShipment(order.id)}>
                            Create shipment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
