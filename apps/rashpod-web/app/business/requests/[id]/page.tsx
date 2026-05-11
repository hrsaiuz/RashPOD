"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { api, type CorporateRequest } from "../../../../lib/api";

export default function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [req, setReq] = useState<CorporateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<CorporateRequest>(`/corporate/requests/${id}`).then(setReq).catch((e) => setError(e?.message || "Failed")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton className="h-64" />;
  if (error || !req) return <div className="text-sm text-red-600">{error || "Not found"}</div>;

  return (
    <div className="space-y-6">
      <Link href="/business/requests" className="text-sm text-brand-muted hover:text-brand-blue">← Back</Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">{req.title}</h1>
          <div className="text-sm text-brand-muted mt-1">{req.quantity} units · created {new Date(req.createdAt).toLocaleDateString()}</div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {req.details && (
        <Card><div className="p-1"><h2 className="font-semibold mb-2">Brief</h2><p className="text-sm text-brand-ink whitespace-pre-wrap">{req.details}</p></div></Card>
      )}

      <Card>
        <div className="p-1">
          <h2 className="font-semibold text-brand-ink mb-3">Bids ({req.bids?.length ?? 0})</h2>
          {!req.bids?.length ? (
            <EmptyState title="No bids yet" description="Designers will submit proposals shortly." />
          ) : (
            <div className="divide-y divide-brand-line">
              {req.bids.map((b) => (
                <div key={b.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-brand-ink whitespace-pre-wrap">{b.proposal}</div>
                    <div className="text-xs text-brand-muted mt-1">Fee {Number(b.designFee).toLocaleString()} · {b.timelineDays} days</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
