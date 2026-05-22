"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type FilmSale = {
  id: string; listingTitle?: string | null; filmType?: string | null; filmWidthCm?: number | null; filmHeightCm?: number | null; filmAreaCm2?: number | null; quantity: number; totalPrice: string | number; designerRoyaltyAmount?: string | number | null; createdAt: string;
  order?: { id: string; status: string; currency: string; createdAt: string };
};

export default function DesignerFilmSalesPage() {
  const router = useRouter(); const { user, isLoading: authLoading } = useAuth(); const [rows, setRows] = useState<FilmSale[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (authLoading) return; if (!user) { router.push("/auth/login?next=/dashboard/designer/film-sales"); return; } async function load() { setLoading(true); setError(""); try { setRows(await api.get<FilmSale[]>("/designer/film-sales")); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load film sales."); } finally { setLoading(false); } } void load(); }, [user, authLoading, router]);
  const totals = useMemo(() => rows.reduce((acc, row) => ({ sales: acc.sales + Number(row.totalPrice || 0), royalty: acc.royalty + Number(row.designerRoyaltyAmount || 0), quantity: acc.quantity + row.quantity }), { sales: 0, royalty: 0, quantity: 0 }), [rows]);
  const columns: DataTableColumn<FilmSale>[] = [
    { key: "title", header: "Design film", render: (_v, row) => <div><p className="font-semibold text-brand-ink">{row.listingTitle || "Film sale"}</p><p className="text-xs text-brand-muted">{row.filmType?.replace("_", "-") || "Film"}</p></div> },
    { key: "size", header: "Size", render: (_v, row) => <span>{number(row.filmWidthCm)} x {number(row.filmHeightCm)} cm</span> },
    { key: "qty", header: "Qty", render: (_v, row) => row.quantity },
    { key: "status", header: "Order", render: (_v, row) => <StatusBadge status={(row.order?.status || "pending").toLowerCase()} /> },
    { key: "royalty", header: "Royalty", render: (_v, row) => money(Number(row.designerRoyaltyAmount || 0), row.order?.currency || "UZS") },
    { key: "date", header: "Date", render: (_v, row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  return <DashboardLayout role="designer"><div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-brand-ink">Film Sales</h1><p className="text-sm text-brand-muted">DTF / UV-DTF sales and royalties from film-enabled designs.</p></div><Link href="/dashboard/designer/film-rights" className="text-sm font-semibold text-brand-blue">Manage film rights</Link></div><div className="grid gap-4 sm:grid-cols-3"><Card><p className="text-xs text-brand-muted">Film revenue</p><p className="text-2xl font-bold text-brand-ink">{money(totals.sales)}</p></Card><Card><p className="text-xs text-brand-muted">Film royalties</p><p className="text-2xl font-bold text-brand-ink">{money(totals.royalty)}</p></Card><Card><p className="text-xs text-brand-muted">Units sold</p><p className="text-2xl font-bold text-brand-ink">{totals.quantity}</p></Card></div>{error ? <ErrorState title="Could not load film sales" description={error} /> : null}{loading ? <Skeleton className="h-64" /> : rows.length === 0 ? <EmptyState title="No film sales yet" description="When customers order films from your enabled designs, sales appear here." /> : <Card><DataTable rows={rows} columns={columns} mobileMode="cards" /></Card>}</div></DashboardLayout>;
}
function number(value?: number | null) { return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function money(value: number, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
