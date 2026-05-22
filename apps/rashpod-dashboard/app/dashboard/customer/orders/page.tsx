"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type OrderSummary = { id: string; orderNumber: string; customerStatus: string; paymentStatus?: string; total: number; currency: string; itemCount: number; createdAt: string; thumbnailUrl?: string | null; canRetryPayment: boolean; paymentRetryDisabledReason?: string | null };

export default function CustomerOrdersPage() {
  const router = useRouter(); const { user, isLoading: authLoading } = useAuth(); const [orders, setOrders] = useState<OrderSummary[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (authLoading) return; if (!user) { router.push("/auth/login?next=/dashboard/customer/orders"); return; } const load = async () => { setLoading(true); setError(""); try { const res = await fetch("/api/proxy/customer/orders"); if (!res.ok) throw new Error(`Server error (${res.status})`); setOrders(await res.json()); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load orders."); } finally { setLoading(false); } }; void load(); }, [user, authLoading, router]);
  return <DashboardLayout role="customer"><div className="mb-6"><h1 className="text-2xl font-bold text-brand-ink">Orders</h1><p className="text-sm text-brand-muted">Your order history, payment state, and production progress.</p></div>{error ? <ErrorState title="Could not load orders" description={error} /> : null}{loading ? <Skeleton className="h-64" /> : null}{!loading && orders.length === 0 ? <EmptyState title="No orders yet" description="Orders will appear here after checkout." /> : null}<div className="grid gap-4">{orders.map((order) => <Link key={order.id} href={`/dashboard/customer/orders/${order.id}`} className="grid gap-4 rounded-2xl border border-brand-line bg-white p-4 shadow-soft hover:border-brand-blue sm:grid-cols-[80px_1fr]"><div className="h-20 w-20 overflow-hidden rounded-xl bg-brand-bg">{order.thumbnailUrl ? <img src={order.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-brand-ink">#{order.orderNumber}</p><p className="text-sm text-brand-muted">{new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.customerStatus.toLowerCase()} /><span className="font-semibold text-brand-ink">{money(order.total, order.currency)}</span></div></div>{order.canRetryPayment ? <p className="mt-3 text-sm font-semibold text-amber-700">Payment retry available</p> : order.paymentRetryDisabledReason ? <p className="mt-3 text-sm text-brand-muted">{order.paymentRetryDisabledReason}</p> : null}</div></Link>)}</div></DashboardLayout>;
}
function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
