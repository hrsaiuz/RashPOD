"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Req = { id: string; title: string; status: string };
type Bid = { id: string; designerId: string; proposal: string; status: string; designFee: string };

export default function AdminCorporatePage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [selectedReq, setSelectedReq] = useState("");
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedBid, setSelectedBid] = useState("");

  const loadRequests = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/corporate/requests`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRequests(await res.json());
  };
  const loadBids = async (requestId: string) => {
    if (!token || !requestId) return;
    const res = await fetch(`${API_URL}/corporate/requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setBids(await res.json());
  };

  useEffect(() => {
    void loadRequests();
  }, [token]);

  const selectBid = async (bidId: string) => {
    if (!token) return;
    await fetch(`${API_URL}/admin/corporate/bids/${bidId}/select`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadBids(selectedReq);
  };

  const createOffer = async () => {
    if (!token || !selectedReq || !selectedBid) return;
    const res = await fetch(`${API_URL}/admin/commercial-offers/${selectedReq}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ selectedBidId: selectedBid, subtotal: 1000000, discount: 0, terms: "Standard terms" }),
    });
    if (!res.ok) return;
    const offer = await res.json();
    await fetch(`${API_URL}/admin/commercial-offers/${offer.id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
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
