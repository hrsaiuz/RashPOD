"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, Skeleton } from "@rashpod/ui";
import { api, type Order } from "../../../../lib/api";

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.get<Order>(`/orders/${id}`).then(setOrder).catch((e) => setError(e?.message || "Failed")).finally(() => setLoading(false));
  }, [id]);

  const cancel = async () => {
    if (!confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const updated = await api.post<Order>(`/orders/${id}/cancel`);
      setOrder(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Skeleton className="h-64" />;
  if (error || !order) return <div className="text-sm text-red-600">{error || "Not found"}</div>;

  const cancellable = order.status === "PENDING_PAYMENT" || order.status === "PAID";

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="text-sm text-brand-muted hover:text-brand-blue">← Back to orders</Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Order {order.id.slice(0, 8).toUpperCase()}</h1>
          <div className="text-sm text-brand-muted mt-1">{new Date(order.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {cancellable && (
            <Button variant="danger" size="sm" loading={cancelling} onClick={cancel}>Cancel</Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-1">
          <h2 className="font-semibold text-brand-ink mb-3">Items</h2>
          <div className="divide-y divide-brand-line">
            {(order.items ?? []).map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-brand-ink">{it.listing?.title ?? "Item"}</div>
                  <div className="text-xs text-brand-muted">Qty {it.quantity} × {Number(it.unitPrice).toLocaleString()}</div>
                </div>
                <div className="font-semibold tabular-nums">{Number(it.totalPrice).toLocaleString()} {order.currency}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-1 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-brand-muted">Subtotal</span><span className="tabular-nums">{Number(order.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-brand-muted">Delivery</span><span className="tabular-nums">{Number(order.deliveryFee).toLocaleString()}</span></div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t border-brand-line"><span>Total</span><span className="tabular-nums">{Number(order.total).toLocaleString()} {order.currency}</span></div>
        </div>
      </Card>
    </div>
  );
}
