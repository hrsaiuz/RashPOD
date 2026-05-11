"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { api, type Order } from "../../../lib/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Order[]>("/orders").then(setOrders).catch((e) => setError(e?.message || "Failed")).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">My orders</h1>
      <Card>
        <div className="p-1">
          {loading ? <Skeleton className="h-40" /> : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <EmptyState title="No orders yet" description="Start shopping to see your orders here."
              action={<Link href="/shop"><Button variant="primaryBlue">Browse shop</Button></Link>} />
          ) : (
            <div className="divide-y divide-brand-line">
              {orders.map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="block py-4 hover:bg-brand-surface rounded-lg px-2 -mx-2 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-brand-ink">Order {o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-brand-muted mt-0.5">{new Date(o.createdAt).toLocaleDateString()} · {o.items?.length ?? 0} item(s)</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={o.status} />
                      <div className="font-semibold tabular-nums">{Number(o.total).toLocaleString()} {o.currency}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
