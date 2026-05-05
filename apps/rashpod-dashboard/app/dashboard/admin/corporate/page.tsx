"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

type Req = { id: string; title: string; status: string };
type Bid = { id: string; designerId: string; proposal: string; status: string; designFee: string };

export default function AdminCorporatePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [selectedReq, setSelectedReq] = useState("");
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedBid, setSelectedBid] = useState("");

  const loadRequests = async () => {
    if (!user) return;
    const res = await fetch(`/api/proxy/corporate/requests`);
    if (res.ok) setRequests(await res.json());
  };
  const loadBids = async (requestId: string) => {
    if (!user || !requestId) return;
    const res = await fetch(`/api/proxy/corporate/requests/${requestId}/bids`);
    if (res.ok) setBids(await res.json());
  };

  useEffect(() => {
    void loadRequests();
  }, [user]);

  const selectBid = async (bidId: string) => {
    if (!user) return;
    await fetch(`/api/proxy/admin/corporate/bids/${bidId}/select`, {
      method: "POST",
    });
    await loadBids(selectedReq);
  };

  const createOffer = async () => {
    if (!user || !selectedReq || !selectedBid) return;
    const res = await fetch(`/api/proxy/admin/commercial-offers/${selectedReq}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedBidId: selectedBid, subtotal: 1000000, discount: 0, terms: "Standard terms" }),
    });
    if (!res.ok) return;
    const offer = await res.json();
    await fetch(`/api/proxy/admin/commercial-offers/${offer.id}/send`, {
      method: "POST",
    });
    await loadRequests();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Corporate Workflow</h1>
      <h2>Requests</h2>
      <ul>
        {requests.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => {
                setSelectedReq(r.id);
                void loadBids(r.id);
              }}
            >
              Open
            </button>{" "}
            {r.title} · {r.status}
          </li>
        ))}
      </ul>
      {selectedReq ? (
        <>
          <h2>Bids for request {selectedReq}</h2>
          <ul>
            {bids.map((b) => (
              <li key={b.id}>
                <input type="radio" name="selectedBid" checked={selectedBid === b.id} onChange={() => setSelectedBid(b.id)} />{" "}
                {b.proposal} · {b.designFee} · {b.status}{" "}
                <button onClick={() => selectBid(b.id)}>Select Bid</button>
              </li>
            ))}
          </ul>
          <button onClick={createOffer} disabled={!selectedBid}>
            Create and send offer
          </button>
        </>
      ) : null}
    </main>
  );
}
