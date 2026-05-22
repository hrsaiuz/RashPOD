"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, ErrorState, Textarea } from "@rashpod/ui";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  requester?: { email: string; displayName: string };
  messages?: Array<{ id: string; body: string; visibility: string; createdAt: string; author?: { displayName: string; email: string } }>;
};

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/proxy/support/tickets/${id}`);
    if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    setTicket(await res.json());
  }

  useEffect(() => {
    if (isLoading || !user) return;
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load ticket."));
  }, [id, user, isLoading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/proxy/support/tickets/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply, internal }) });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setReply(""); setInternal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="support">
      {error ? <ErrorState title="Ticket issue" description={error} /> : null}
      {!ticket ? <div className="rounded-xl border border-brand-line bg-white p-5 text-sm text-brand-muted">Loading ticket...</div> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-brand-ink">{ticket.subject}</h1>
                <p className="text-sm text-brand-muted">{ticket.requester?.displayName || ticket.requester?.email} · {ticket.category}</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-pill bg-brand-blueLight px-3 py-1 text-brand-blue">{ticket.status}</span>
                <span className="rounded-pill bg-brand-peachLight px-3 py-1 text-brand-peach">{ticket.priority}</span>
              </div>
            </div>
            <div className="space-y-3">
              {(ticket.messages ?? []).map((message) => (
                <div key={message.id} className={"rounded-xl border p-4 " + (message.visibility === "INTERNAL" ? "border-amber-200 bg-amber-50" : "border-brand-line bg-surface-card") }>
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-brand-muted">
                    <span>{message.author?.displayName || message.author?.email || "RashPOD"}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-brand-ink">{message.body}</p>
                </div>
              ))}
            </div>
          </section>
          <aside className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Reply</h2>
            <form onSubmit={submit} className="space-y-3">
              <Textarea required value={reply} onChange={(event) => setReply(event.target.value)} rows={6} />
              <label className="flex items-center gap-2 text-sm text-brand-ink"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} className="accent-brand-blue" /> Internal note</label>
              <Button type="submit" loading={saving}>Add reply</Button>
            </form>
          </aside>
        </div>
      )}
    </DashboardLayout>
  );
}
