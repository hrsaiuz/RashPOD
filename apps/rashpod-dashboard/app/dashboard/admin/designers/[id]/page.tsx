"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, EmptyState, ErrorState, FormField, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import { Gift, Store, UserRound } from "lucide-react";
import DashboardLayout from "../../../dashboard-layout";
import { api } from "../../../../../lib/api";

interface DesignerDetail {
  id: string;
  email: string;
  displayName: string;
  handle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  designerStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  designAssets: Array<{ id: string; title: string; status: string; createdAt: string }>;
  listings: Array<{ id: string; title: string; status: string; price: string | number; currency: string }>;
  bonuses: Array<{ id: string; amountUzs: string | number; reason: string; status: string; createdAt: string }>;
  payouts: Array<{ id: string; amountUzs: string | number; status: string; createdAt: string }>;
  earningsSummary: { royaltiesUzs: number; bonusesUzs: number; unpaidUzs: number };
}

export default function AdminDesignerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [designer, setDesigner] = useState<DesignerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bonusAmount, setBonusAmount] = useState("50000");
  const [bonusReason, setBonusReason] = useState("Manual designer bonus");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setDesigner(await api.get<DesignerDetail>(`/admin/users/designers/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function updateStatus(status: DesignerDetail["designerStatus"]) {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/admin/users/designers/${id}/status`, { status, reason: `Admin changed designer status to ${status}` });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  async function grantBonus(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/admin/users/designers/${id}/bonus`, { amount: Number(bonusAmount), currency: "UZS", reason: bonusReason });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant bonus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {error ? <ErrorState title="Designer management issue" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} /> : null}
        {loading ? (
          <Skeleton className="h-80" />
        ) : !designer ? (
          <Card><EmptyState title="Designer not found" description="The selected designer record is no longer available." /></Card>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-brand-ink">{designer.displayName}</h1>
                <p className="text-brand-muted mt-1">{designer.email}{designer.handle ? ` · /designer/${designer.handle}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={designer.designerStatus} />
                <Button variant="secondary" loading={saving} onClick={() => updateStatus(designer.designerStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
                  {designer.designerStatus === "ACTIVE" ? "Inactivate" : "Reactivate"}
                </Button>
                <Button variant="danger" loading={saving} onClick={() => updateStatus("SUSPENDED")}>Suspend</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card>
                <div className="flex items-center gap-2 text-brand-ink font-semibold mb-3"><UserRound size={18} /> Profile</div>
                <p className="text-sm text-brand-muted">{designer.bio || "No designer bio yet."}</p>
                <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-brand-muted">Joined</dt><dd className="text-brand-ink">{new Date(designer.createdAt).toLocaleDateString()}</dd></div><div><dt className="text-brand-muted">Shop handle</dt><dd className="text-brand-ink">{designer.handle || "Not set"}</dd></div></dl>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-brand-ink font-semibold mb-3"><Store size={18} /> Shop</div>
                <p className="text-sm text-brand-muted mb-4">{designer.listings.length} recent listings</p>
                <div className="space-y-2">{designer.listings.slice(0, 5).map((listing) => <div key={listing.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-brand-ink truncate">{listing.title}</span><StatusBadge status={listing.status} /></div>)}</div>
              </Card>
              <Card>
                <div className="text-brand-ink font-semibold mb-3">Income</div>
                <div className="space-y-3 text-sm"><div><p className="text-brand-muted">Royalties</p><p className="text-xl font-bold text-brand-ink">{designer.earningsSummary.royaltiesUzs.toLocaleString()} UZS</p></div><div><p className="text-brand-muted">Bonuses</p><p className="text-xl font-bold text-brand-ink">{designer.earningsSummary.bonusesUzs.toLocaleString()} UZS</p></div><div><p className="text-brand-muted">Unpaid</p><p className="text-xl font-bold text-brand-ink">{designer.earningsSummary.unpaidUzs.toLocaleString()} UZS</p></div></div>
              </Card>
            </div>

            <Card>
              <form onSubmit={grantBonus} className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <div className="flex items-center gap-2 text-brand-ink font-semibold"><Gift size={18} /> Manual bonus</div>
                <FormField label="Amount" className="lg:w-44"><Input value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} /></FormField>
                <FormField label="Reason" className="flex-1"><Input value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} /></FormField>
                <Button type="submit" variant="primaryBlue" loading={saving}>Grant bonus</Button>
              </form>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card><h2 className="text-lg font-semibold text-brand-ink mb-4">Recent designs</h2><div className="space-y-2">{designer.designAssets.map((design) => <div key={design.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate text-brand-ink">{design.title}</p><Link href={`/dashboard/moderator/designs/${design.id}`} className="text-xs font-semibold text-brand-blue">Open story review</Link></div><StatusBadge status={design.status} /></div>)}</div></Card>
              <Card><h2 className="text-lg font-semibold text-brand-ink mb-4">Recent bonuses</h2>{designer.bonuses.length === 0 ? <p className="text-sm text-brand-muted">No bonuses yet.</p> : <div className="space-y-2">{designer.bonuses.map((bonus) => <div key={bonus.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-brand-ink truncate">{bonus.reason}</span><span className="font-semibold text-brand-ink">{Number(bonus.amountUzs).toLocaleString()} UZS</span></div>)}</div>}</Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
