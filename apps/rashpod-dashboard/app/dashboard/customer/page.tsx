"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KpiTile, StatusBadge, EmptyState, ErrorState, Skeleton } from "@rashpod/ui";
import { AlertCircle, LifeBuoy, Package, Truck, WalletCards } from "lucide-react";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

type OrderSummary = { id: string; orderNumber: string; customerStatus: string; paymentStatus?: string; total: number; currency: string; itemCount: number; createdAt: string; canRetryPayment: boolean };
type CustomerDashboard = { activeOrders: number; unpaidOrders: number; readyOrders: number; productionSummary: Record<string, number>; recentOrders: OrderSummary[] };

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login?next=/dashboard/customer"); return; }
    const load = async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch("/api/proxy/customer/dashboard");
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        setData(await res.json());
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard."); }
      finally { setLoading(false); }
    };
    void load();
  }, [user, authLoading, router]);

  return (
    <DashboardLayout role="customer">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-brand-ink">Customer Dashboard</h1><p className="text-sm text-brand-muted">Track orders, payments, production, and support requests.</p></div>
        <Link href="/dashboard/customer/support" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-brand-blue px-4 py-2 text-sm font-semibold text-white"><LifeBuoy size={16} /> Contact support</Link>
      </div>
      {error ? <ErrorState title="Could not load dashboard" description={error} /> : null}
      {loading ? <Skeleton className="h-48" /> : null}
      {data ? <>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Active orders" value={data.activeOrders} icon={<Package size={22} />} />
          <KpiTile label="Payment attention" value={data.unpaidOrders} icon={<WalletCards size={22} />} />
          <KpiTile label="Ready soon" value={data.readyOrders} icon={<Truck size={22} />} />
          <KpiTile label="Needs action" value={data.recentOrders.filter((order) => order.canRetryPayment).length} icon={<AlertCircle size={22} />} />
        </div>
        <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-brand-ink">Recent Orders</h2><Link href="/dashboard/customer/orders" className="text-sm font-semibold text-brand-blue">View all</Link></div>
          {data.recentOrders.length === 0 ? <EmptyState title="No orders yet" description="Your recent orders will appear here after checkout." /> : <div className="grid gap-3">{data.recentOrders.map((order) => <Link key={order.id} href={`/dashboard/customer/orders/${order.id}`} className="rounded-xl border border-brand-line p-4 hover:border-brand-blue"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-brand-ink">#{order.orderNumber}</p><p className="text-sm text-brand-muted">{new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items</p></div><div className="flex flex-wrap items-center gap-3"><StatusBadge status={order.customerStatus.toLowerCase()} /> <span className="font-semibold text-brand-ink">{money(order.total, order.currency)}</span></div></div></Link>)}</div>}
        </section>
      </> : null}
    </DashboardLayout>
  );
}
function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
