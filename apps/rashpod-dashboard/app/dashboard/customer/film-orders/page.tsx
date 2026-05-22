"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type FilmOrder = {
  id: string;
  status: string;
  total: string | number;
  currency: string;
  createdAt: string;
  items: Array<{ id: string; listingTitle?: string | null; itemKind?: string | null; filmType?: string | null; filmWidthCm?: number | null; filmHeightCm?: number | null; filmAreaCm2?: number | null; quantity: number; productionFileAssetId?: string | null }>;
  productionJobs: Array<{ id: string; status: string; queueType: string; productionFileStatus?: string | null }>;
};

export default function CustomerFilmOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<FilmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login?next=/dashboard/customer/film-orders"); return; }
    async function load() {
      setLoading(true); setError("");
      try { setOrders(await api.get<FilmOrder[]>("/customer/film-orders")); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed to load film orders."); }
      finally { setLoading(false); }
    }
    void load();
  }, [user, authLoading, router]);

  return <DashboardLayout role="customer"><div className="space-y-6"><div><h1 className="text-2xl font-bold text-brand-ink">Film Orders</h1><p className="text-sm text-brand-muted">DTF and UV-DTF transfer film orders with production progress.</p></div>{error ? <ErrorState title="Could not load film orders" description={error} /> : null}{loading ? <Skeleton className="h-64" /> : orders.length === 0 ? <EmptyState title="No film orders yet" description="Film transfer orders will appear here after checkout." /> : <div className="grid gap-4">{orders.map((order) => { const first = order.items[0]; const job = order.productionJobs.find((j) => j.id) ?? null; return <Link key={order.id} href={`/dashboard/customer/film-orders/${order.id}`} className="block"><Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold text-brand-ink">#{order.id.slice(-6)} · {first?.listingTitle || (first?.itemKind === "CUSTOM_FILM" ? "Custom film" : "Film order")}</p><p className="mt-1 text-sm text-brand-muted">{first?.filmType?.replace("_", "-") || "Film"} · {number(first?.filmWidthCm)} x {number(first?.filmHeightCm)} cm · Qty {first?.quantity ?? 1}</p><p className="mt-1 text-xs text-brand-muted">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status.toLowerCase()} />{job ? <StatusBadge status={(job.productionFileStatus || job.status).toLowerCase()} /> : null}<span className="font-semibold text-brand-ink">{money(Number(order.total), order.currency)}</span></div></div></Card></Link>; })}</div>}</div></DashboardLayout>;
}

function number(value?: number | null) { return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
