"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, ErrorState, Input, Textarea } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type Profile = { id: string; email: string; displayName: string; role: string; phone?: string | null; tags?: Array<{ key: string; label: string; color?: string | null }>; counts?: Record<string, number> };
type ProfileDetail = Profile & { notes?: Array<{ id: string; note: string; createdAt: string; author?: { displayName: string; email: string } }>; supportRequests?: Array<{ id: string; subject: string | null; status: string; updatedAt: string }> };

export default function SupportCrmPage() {
  const { user, isLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<ProfileDetail | null>(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function search(q = query) {
    const res = await fetch(`/api/proxy/crm/profiles${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const data = await res.json();
    setProfiles(data);
    if (!selected && data[0]) await openProfile(data[0].id);
  }

  async function openProfile(id: string) {
    const res = await fetch(`/api/proxy/crm/profiles/${id}`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    setSelected(await res.json());
  }

  useEffect(() => {
    if (isLoading || !user) return;
    search().catch((err) => setError(err instanceof Error ? err.message : "Failed to load CRM profiles.")).finally(() => setLoading(false));
  }, [user, isLoading]);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    search().catch((err) => setError(err instanceof Error ? err.message : "Search failed."));
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const res = await fetch(`/api/proxy/crm/profiles/${selected.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    if (!res.ok) { setError(`Server error (${res.status})`); return; }
    setNote("");
    await openProfile(selected.id);
  }

  return (
    <DashboardLayout role="support">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-brand-ink">CRM Profiles</h1>
        <p className="text-sm text-brand-muted">Support context for customers, designers, and corporate accounts.</p>
      </div>
      {error ? <ErrorState title="CRM issue" description={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-brand-line bg-white p-4 shadow-soft">
          <form onSubmit={submitSearch} className="mb-3 flex gap-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
            <Button type="submit" aria-label="Search"><Search size={16} /></Button>
          </form>
          <div className="space-y-2">
            {loading ? <p className="text-sm text-brand-muted">Loading profiles...</p> : null}
            {profiles.map((profile) => (
              <button key={profile.id} onClick={() => openProfile(profile.id)} className="block w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2 text-left hover:border-brand-blue">
                <div className="text-sm font-semibold text-brand-ink">{profile.displayName}</div>
                <div className="text-xs text-brand-muted">{profile.email} · {profile.role}</div>
              </button>
            ))}
          </div>
        </aside>
        <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
          {!selected ? <p className="text-sm text-brand-muted">Select a profile.</p> : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-brand-ink">{selected.displayName}</h2>
                <p className="text-sm text-brand-muted">{selected.email} · {selected.role}{selected.phone ? ` · ${selected.phone}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2">{(selected.tags ?? []).map((tag) => <span key={tag.key} className="rounded-pill bg-brand-blueLight px-3 py-1 text-xs font-semibold text-brand-blue">{tag.label}</span>)}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {Object.entries(selected.counts ?? {}).map(([key, value]) => <div key={key} className="rounded-xl bg-surface-card p-3"><div className="text-lg font-bold text-brand-ink">{value}</div><div className="text-xs text-brand-muted">{key}</div></div>)}
              </div>
              <form onSubmit={addNote} className="space-y-3">
                <Textarea required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a CRM note" />
                <Button type="submit">Add note</Button>
              </form>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-brand-ink">Recent notes</h3>
                <div className="space-y-2">{(selected.notes ?? []).map((item) => <div key={item.id} className="rounded-xl border border-brand-line p-3 text-sm text-brand-ink"><p>{item.note}</p><p className="mt-1 text-xs text-brand-muted">{item.author?.displayName || item.author?.email || "Staff"} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-brand-ink">Recent tickets</h3>
                <div className="space-y-2">{(selected.supportRequests ?? []).map((ticket) => <div key={ticket.id} className="rounded-xl bg-surface-card p-3 text-sm"><span className="font-semibold text-brand-ink">{ticket.subject || ticket.id}</span><span className="ml-2 text-brand-muted">{ticket.status}</span></div>)}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
