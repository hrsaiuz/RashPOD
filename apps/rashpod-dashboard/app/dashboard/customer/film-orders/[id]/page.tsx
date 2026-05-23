"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { api } from "../../../../../lib/api";

type FilmOrder = {
  id: string; status: string; total: string | number; currency: string; createdAt: string; customerNote?: string | null;
  items: Array<{ id: string; listingTitle?: string | null; itemKind?: string | null; filmType?: string | null; filmWidthCm?: number | null; filmHeightCm?: number | null; filmAreaCm2?: number | null; quantity: number; filmPricingSnapshotJson?: Record<string, unknown> | null }>;
  productionJobs: Array<{ id: string; status: string; queueType: string; productionFileStatus?: string | null; blockerReason?: string | null; failureReason?: string | null }>;
};

export default function CustomerFilmOrderDetailPage() {
  const router = useRouter(); const params = useParams<{ id: string }>(); const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<FilmOrder | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (authLoading) return; if (!user) { router.push(`/auth/login?next=/dashboard/customer/film-orders/${params.id}`); return; } async function load() { setLoading(true); setError(""); try { setOrder(await api.get<FilmOrder>(`/customer/film-orders/${params.id}`)); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load film order."); } finally { setLoading(false); } } void load(); }, [user, authLoading, router, params.id]);
  return <DashboardLayout role="customer"><div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-brand-ink">Film Order #{params.id.slice(-6)}</h1><p className="text-sm text-brand-muted">Production status and print specifications.</p></div><Link href="/dashboard/customer/film-orders"><Button variant="secondary">Back</Button></Link></div>{error ? <ErrorState title="Could not load film order" description={error} /> : null}{loading ? <Skeleton className="h-64" /> : order ? <><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-brand-muted">Placed {new Date(order.createdAt).toLocaleDateString()}</p><p className="text-xl font-bold text-brand-ink">{money(Number(order.total), order.currency)}</p></div><StatusBadge status={order.status.toLowerCase()} /></div></Card><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Film specs</h2><div className="space-y-3">{order.items.map((item) => <div key={item.id} className="rounded-xl border border-brand-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-brand-ink">{item.listingTitle || (item.itemKind === "CUSTOM_FILM" ? "Custom upload" : "Design film")}</p><StatusBadge status={(item.filmType || "film").toLowerCase()} /></div><p className="mt-2 text-sm text-brand-muted">{number(item.filmWidthCm)} x {number(item.filmHeightCm)} cm · {number(item.filmAreaCm2)} cm2 · Qty {item.quantity}</p></div>)}</div></Card><Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Production</h2><div className="space-y-3">{order.productionJobs.map((job) => <div key={job.id} className="rounded-xl border border-brand-line p-4"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={job.queueType.toLowerCase()} /><StatusBadge status={job.status.toLowerCase()} /><StatusBadge status={(job.productionFileStatus || "file").toLowerCase()} /></div>{job.failureReason || job.blockerReason ? <p className="mt-2 text-sm text-semantic-dangerText">{job.failureReason || job.blockerReason}</p> : null}</div>)}</div></Card></div></> : null}</div></DashboardLayout>;
}
function number(value?: number | null) { return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
