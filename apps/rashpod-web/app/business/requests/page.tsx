"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, Skeleton, EmptyState } from "@rashpod/ui";
import { api, type CorporateRequest } from "../../../lib/api";

export default function RequestsPage() {
  const [reqs, setReqs] = useState<CorporateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<CorporateRequest[]>("/corporate/requests").then(setReqs).catch((e) => setError(e?.message || "Failed")).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-ink">Briefs</h1>
        <Link href="/business/requests/new"><Button variant="primaryBlue">New brief</Button></Link>
      </div>
      <Card>
        <div className="p-1">
          {loading ? <Skeleton className="h-40" /> : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : reqs.length === 0 ? (
            <EmptyState title="No briefs yet" description="Submit your first brief to get bids."
              action={<Link href="/business/requests/new"><Button variant="primaryBlue">Create brief</Button></Link>} />
          ) : (
            <div className="divide-y divide-brand-line">
              {reqs.map((r) => (
                <Link key={r.id} href={`/business/requests/${r.id}`} className="block py-4 px-2 -mx-2 rounded-lg hover:bg-brand-surface transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-brand-ink">{r.title}</div>
                      <div className="text-xs text-brand-muted mt-0.5">{r.quantity} units · {new Date(r.createdAt).toLocaleDateString()} · {r.bids?.length ?? 0} bids</div>
                    </div>
                    <StatusBadge status={r.status} />
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
