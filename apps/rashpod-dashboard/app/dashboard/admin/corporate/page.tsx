"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Briefcase } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type Req = { id: string; title: string; status: string };
type Bid = { id: string; designerId: string; proposal: string; status: string; designFee: string };

export default function AdminCorporatePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [selectedReq, setSelectedReq] = useState("");
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedBid, setSelectedBid] = useState("");
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.get<Req[]>("/corporate/requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load corporate requests");
    } finally {
      setLoading(false);
    }
  };

  const loadBids = async (requestId: string) => {
    if (!user || !requestId) return;
    setBidsLoading(true);
    setError("");
    try {
      const data = await api.get<Bid[]>(`/corporate/requests/${requestId}/bids`);
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bids");
      setBids([]);
    } finally {
      setBidsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [user]);

  const selectBid = async (bidId: string) => {
    if (!user) return;
    setActing(true);
    setMessage("");
    try {
      await api.post(`/admin/corporate/bids/${bidId}/select`);
      setMessage("Bid selected.");
      await loadBids(selectedReq);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select bid");
    } finally {
      setActing(false);
    }
  };

  const createOffer = async () => {
    if (!user || !selectedReq || !selectedBid) return;
    setActing(true);
    setMessage("");
    setError("");
    try {
      const offer = await api.post<{ id: string }>(`/admin/commercial-offers/${selectedReq}`, {
        selectedBidId: selectedBid,
        subtotal: 1000000,
        discount: 0,
        terms: "Standard terms",
      });
      await api.post(`/admin/commercial-offers/${offer.id}/send`);
      setMessage("Commercial offer created and sent.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create offer");
    } finally {
      setActing(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Corporate Workflow</h1>
          <p className="text-brand-muted mt-1">Review corporate requests, select designer bids, and send commercial offers.</p>
        </div>

        {error ? <ErrorState title="Corporate workflow issue" description={error} retry={<Button onClick={loadRequests}>Retry</Button>} /> : null}
        {message ? <div className="rounded-xl border border-semantic-successBg bg-semantic-successBg px-4 py-3 text-sm text-brand-ink">{message}</div> : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Requests</h2>
            {loading ? <Skeleton className="h-40" /> : requests.length === 0 ? (
              <EmptyState icon={<Briefcase className="text-brand-peach" size={32} />} title="No corporate requests" description="Incoming corporate requests will appear here." />
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <button key={request.id} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedReq === request.id ? "border-brand-blue bg-brand-blue/5" : "border-surface-borderSoft bg-white hover:border-brand-blue/40"}`} onClick={() => { setSelectedReq(request.id); void loadBids(request.id); }}>
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-brand-ink">{request.title}</span><StatusBadge status={request.status} /></div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Bids</h2>
            {!selectedReq ? (
              <p className="text-sm text-brand-muted">Select a request to review designer bids.</p>
            ) : bidsLoading ? (
              <Skeleton className="h-40" />
            ) : bids.length === 0 ? (
              <EmptyState title="No bids yet" description="Designer bids for the selected corporate request will appear here." />
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <label key={bid.id} className="block rounded-2xl border border-surface-borderSoft p-4">
                    <div className="flex items-start gap-3"><input className="mt-1" type="radio" name="selectedBid" checked={selectedBid === bid.id} onChange={() => setSelectedBid(bid.id)} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-brand-ink">{bid.proposal}</p><p className="text-xs text-brand-muted mt-1">{Number(bid.designFee).toLocaleString()} UZS</p></div><StatusBadge status={bid.status} /></div>
                    <Button size="sm" variant="secondary" className="mt-3" loading={acting} onClick={() => selectBid(bid.id)}>Select bid</Button>
                  </label>
                ))}
                <Button variant="primaryBlue" onClick={createOffer} disabled={!selectedBid} loading={acting}>Create and send offer</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
