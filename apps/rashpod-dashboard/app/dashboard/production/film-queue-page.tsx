"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Download, FilePlus2, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { api } from "../../../lib/api";

type FilmJob = {
  id: string;
  status: string;
  queueType: string;
  productionFileStatus?: string | null;
  productSnapshotJson?: { listingTitle?: string; itemKind?: string; filmType?: string; filmWidthCm?: number; filmHeightCm?: number; filmAreaCm2?: number; quantity?: number } | null;
  order: { id: string; customerName?: string | null; customerPhone?: string | null; status?: string | null };
  orderItem?: { id: string; listingTitle?: string | null; quantity: number; filmWidthCm?: number | null; filmHeightCm?: number | null; filmAreaCm2?: number | null; itemKind?: string | null } | null;
};

export function FilmQueuePage({ queueType, title }: { queueType: "DTF" | "UV_DTF"; title: string }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<FilmJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      setJobs(await api.get<FilmJob[]>(`/production/items?queueType=${queueType}&sort=priority`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load film queue.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/auth/login?next=/dashboard/production/${queueType === "DTF" ? "dtf" : "uv-dtf"}`); return; }
    void load();
  }, [user, authLoading, queueType, router]);

  async function requestFile(job: FilmJob) {
    setWorking(job.id); setError("");
    try {
      await api.post(`/production/items/${job.id}/${job.productionFileStatus === "FAILED" ? "retry-file" : "request-file"}`, { reason: "Film production queue request" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "File request failed."); }
    finally { setWorking(null); }
  }

  async function download(job: FilmJob) {
    setWorking(job.id); setError("");
    try {
      const data = await api.get<{ url: string }>(`/production/items/${job.id}/download-file`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed."); }
    finally { setWorking(null); }
  }

  const columns: DataTableColumn<FilmJob>[] = [
    { key: "order", header: "Order", render: (_v, job) => <div><Link className="font-semibold text-brand-blue" href={`/dashboard/production/jobs/${job.id}`}>#{job.order.id.slice(-6)}</Link><p className="text-xs text-brand-muted">{job.order.customerName || "Customer"}</p></div> },
    { key: "item", header: "Film", render: (_v, job) => <div><p className="font-medium text-brand-ink">{job.orderItem?.listingTitle || job.productSnapshotJson?.listingTitle || "Custom film"}</p><p className="text-xs text-brand-muted">{job.orderItem?.itemKind || job.productSnapshotJson?.itemKind || "FILM"}</p></div> },
    { key: "dimensions", header: "Size", render: (_v, job) => <span className="text-sm text-brand-ink">{number(job.orderItem?.filmWidthCm ?? job.productSnapshotJson?.filmWidthCm)} x {number(job.orderItem?.filmHeightCm ?? job.productSnapshotJson?.filmHeightCm)} cm</span> },
    { key: "area", header: "Area", render: (_v, job) => <span className="text-sm text-brand-muted">{number(job.orderItem?.filmAreaCm2 ?? job.productSnapshotJson?.filmAreaCm2)} cm2</span> },
    { key: "file", header: "File", render: (_v, job) => <StatusBadge status={(job.productionFileStatus || "missing").toLowerCase()} /> },
    { key: "status", header: "Status", render: (_v, job) => <StatusBadge status={job.status.toLowerCase()} /> },
    { key: "actions", header: "", render: (_v, job) => <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" loading={working === job.id} onClick={() => requestFile(job)}><FilePlus2 size={14} /></Button><Button size="sm" variant="ghost" disabled={job.productionFileStatus !== "READY"} loading={working === job.id} onClick={() => download(job)}><Download size={14} /></Button></div> },
  ];

  return <DashboardLayout role="production"><div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-brand-ink">{title}</h1><p className="text-sm text-brand-muted">Local film production jobs, print files, and queue status.</p></div><Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button></div>{error ? <ErrorState title="Could not load queue" description={error} /> : null}{loading ? <Skeleton className="h-64" /> : jobs.length === 0 ? <EmptyState title="No film jobs" description="Paid film orders for this queue will appear here." /> : <Card><DataTable rows={jobs} columns={columns} mobileMode="cards" /></Card>}</div></DashboardLayout>;
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
