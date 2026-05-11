"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatusBadge, Skeleton, EmptyState, Button } from "@rashpod/ui";
import { api, type Order } from "../../../lib/api";

export default function BusinessOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>("/orders").then(setOrders).catch(() => null).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Orders</h1>
      <Card>
        <div className="p-1">
          {loading ? <Skeleton className="h-40" /> : orders.length === 0 ? (
            <EmptyState title="No orders" description="Awarded briefs will appear here as production orders."
              action={<Link href="/business/requests"><Button variant="primaryBlue">View briefs</Button></Link>} />
          ) : (
            <div className="divide-y divide-brand-line">
              {orders.map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="block py-4 px-2 -mx-2 rounded-lg hover:bg-brand-surface transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-brand-ink">Order {o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-brand-muted mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
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
