"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { api, type CorporateRequest } from "../../../lib/api";

export default function OffersPage() {
  const [reqs, setReqs] = useState<CorporateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CorporateRequest[]>("/corporate/requests").then(setReqs).catch(() => null).finally(() => setLoading(false));
  }, []);

  const offers = reqs.flatMap((r) => (r.bids ?? []).map((b) => ({ ...b, request: r })));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Offers received</h1>
      <Card>
        <div className="p-1">
          {loading ? <Skeleton className="h-40" /> : offers.length === 0 ? (
            <EmptyState title="No offers yet" description="Offers from designers will appear here once briefs are posted." />
          ) : (
            <div className="divide-y divide-brand-line">
              {offers.map((o) => (
                <div key={o.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-brand-ink">{o.request.title}</div>
                    <div className="text-sm text-brand-ink mt-1 line-clamp-2">{o.proposal}</div>
                    <div className="text-xs text-brand-muted mt-1">Fee {Number(o.designFee).toLocaleString()} · {o.timelineDays} days</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
