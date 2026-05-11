"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, KpiTile, Button, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { FileText, Inbox, CheckCircle, Clock } from "lucide-react";
import { api, type CorporateRequest } from "../../lib/api";

export default function BusinessOverview() {
  const [reqs, setReqs] = useState<CorporateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<CorporateRequest[]>("/corporate/requests").then(setReqs).catch((e) => setError(e?.message || "Failed")).finally(() => setLoading(false));
  }, []);

  const kpis = {
    total: reqs.length,
    open: reqs.filter((r) => ["DRAFT", "BIDDING"].includes(r.status)).length,
    inProduction: reqs.filter((r) => ["AWARDED", "IN_PRODUCTION"].includes(r.status)).length,
    completed: reqs.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-ink mb-2">Corporate dashboard</h1>
        <p className="text-brand-muted">Manage your bulk orders and design briefs.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></>
        ) : (
          <>
            <KpiTile label="Total briefs" value={kpis.total} icon={<FileText size={22} />} />
            <KpiTile label="Open for bids" value={kpis.open} icon={<Clock size={22} />} />
            <KpiTile label="In production" value={kpis.inProduction} icon={<Inbox size={22} />} />
            <KpiTile label="Completed" value={kpis.completed} icon={<CheckCircle size={22} />} />
          </>
        )}
      </div>

      <Card>
        <div className="p-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-ink">Recent briefs</h2>
            <Link href="/business/requests/new"><Button variant="primaryBlue" size="sm">New brief</Button></Link>
          </div>
          {loading ? <Skeleton className="h-32" /> : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : reqs.length === 0 ? (
            <EmptyState title="No briefs yet" description="Submit a brief to get bids from approved designers."
              action={<Link href="/business/requests/new"><Button variant="primaryBlue">Create brief</Button></Link>} />
          ) : (
            <div className="divide-y divide-brand-line">
              {reqs.slice(0, 5).map((r) => (
                <Link key={r.id} href={`/business/requests/${r.id}`} className="flex items-center justify-between py-3 hover:bg-brand-surface rounded-lg px-2">
                  <div>
                    <div className="font-medium text-brand-ink">{r.title}</div>
                    <div className="text-xs text-brand-muted">{r.quantity} units · {new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
