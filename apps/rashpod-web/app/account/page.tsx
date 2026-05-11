"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, KpiTile, Button, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { Package, Truck, CheckCircle, Heart } from "lucide-react";
import { api, type Order } from "../../lib/api";

export default function CustomerOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Order[]>("/orders").then(setOrders).catch((e) => setError(e?.message || "Failed to load")).finally(() => setLoading(false));
  }, []);

  const kpis = {
    total: orders.length,
    inTransit: orders.filter((o) => ["IN_PRODUCTION", "READY_FOR_PICKUP", "SHIPPED"].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    wishlist: 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-ink mb-2">Welcome back</h1>
        <p className="text-brand-muted">Track your orders and saved designs.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </>
        ) : (
          <>
            <KpiTile label="Total orders" value={kpis.total} icon={<Package size={22} />} />
            <KpiTile label="In transit" value={kpis.inTransit} icon={<Truck size={22} />} />
            <KpiTile label="Delivered" value={kpis.delivered} icon={<CheckCircle size={22} />} />
            <KpiTile label="Wishlist" value={kpis.wishlist} icon={<Heart size={22} />} />
          </>
        )}
      </div>

      <Card>
        <div className="p-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-ink">Recent orders</h2>
            <Link href="/account/orders"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
          {loading ? <Skeleton className="h-32" /> : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <EmptyState title="No orders yet" description="Browse the shop to find something unique."
              action={<Link href="/shop"><Button variant="primaryBlue">Shop now</Button></Link>} />
          ) : (
            <div className="divide-y divide-brand-line">
              {orders.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between py-3 hover:bg-brand-surface rounded-lg px-2">
                  <div>
                    <div className="font-medium text-brand-ink">Order {o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-brand-muted">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <div className="font-semibold tabular-nums text-brand-ink">{Number(o.total).toLocaleString()} {o.currency}</div>
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
