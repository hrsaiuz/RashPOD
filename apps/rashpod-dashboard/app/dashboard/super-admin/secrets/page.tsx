"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button, Card, Drawer, EmptyState, ErrorState, Input, Skeleton, Textarea } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell } from "../super-admin-ui";

type SecretReference = {
  id: string;
  name: string;
  envVar: string;
  secretManagerRef?: string | null;
  service: string;
  lastRotatedAt?: string | null;
  notes?: string | null;
  isNew?: boolean;
};

const EMPTY_SECRET: SecretReference = { id: "", name: "", envVar: "", service: "rashpod-api", isNew: true };

export default function SuperAdminSecretsPage() {
  const [rows, setRows] = useState<SecretReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editing, setEditing] = useState<SecretReference | null>(null);
  const [deleting, setDeleting] = useState<SecretReference | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.get<SecretReference[]>("/super-admin/secrets");
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load secret references");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFeedback(null);
    const payload = {
      name: editing.name.trim(),
      envVar: editing.envVar.trim().toUpperCase(),
      service: editing.service.trim(),
      secretManagerRef: editing.secretManagerRef?.trim() || undefined,
      lastRotatedAt: editing.lastRotatedAt || undefined,
      notes: editing.notes?.trim() || undefined,
    };
    try {
      if (editing.isNew) await api.post("/super-admin/secrets", payload);
      else await api.patch(`/super-admin/secrets/${editing.id}`, payload);
      setFeedback({ kind: "success", message: editing.isNew ? "Secret reference added." : "Secret reference updated." });
      setEditing(null);
      await load();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not save secret reference" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.delete(`/super-admin/secrets/${deleting.id}`);
      setFeedback({ kind: "success", message: `${deleting.envVar} reference deleted. The external secret itself was not changed.` });
      setDeleting(null);
      await load();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not delete secret reference" });
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Secret references"
      description="Document where credentials are injected. RashPOD stores reference metadata only—never raw secret values."
      icon={<KeyRound size={22} />}
      action={(
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} aria-label="Refresh secret references"><RefreshCw size={16} aria-hidden="true" /></Button>
          <Button onClick={() => setEditing({ ...EMPTY_SECRET })}>Add reference</Button>
        </div>
      )}
    >
      <FeedbackBanner feedback={editing ? null : feedback} onDismiss={() => setFeedback(null)} />
      <p className="text-sm leading-6 text-brand-muted">
        Manage credential values in{" "}
        <a className="font-semibold text-brand-blue underline underline-offset-4" href="https://console.cloud.google.com/security/secret-manager" target="_blank" rel="noreferrer">
          Google Cloud Secret Manager<span className="sr-only"> (opens in a new tab)</span>
        </a>.
      </p>

      {loading ? <Skeleton className="h-64" /> : loadError ? (
        <ErrorState title="Could not load secret references" description={loadError} retry={<Button onClick={() => void load()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No secret references" description="Add metadata that tells operators where each service credential is managed." />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">Configured external secret references</caption>
              <thead className="bg-surface-app text-brand-muted">
                <tr><th scope="col" className="px-5 py-3 text-left">Name</th><th scope="col" className="px-5 py-3 text-left">Environment variable</th><th scope="col" className="px-5 py-3 text-left">Service</th><th scope="col" className="px-5 py-3 text-left">Last rotated</th><th scope="col" className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-app/60">
                    <td className="px-5 py-4"><p className="font-medium">{row.name}</p><p className="mt-1 max-w-xs break-all font-mono text-xs text-brand-muted">{row.secretManagerRef || "Reference not recorded"}</p></td>
                    <td className="px-5 py-4 font-mono text-xs">{row.envVar}</td>
                    <td className="px-5 py-4">{row.service}</td>
                    <td className="px-5 py-4">{row.lastRotatedAt ? new Date(row.lastRotatedAt).toLocaleDateString() : "Not recorded"}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing({ ...row })}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleting(row)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer open={Boolean(editing)} side="right" title={editing?.isNew ? "Add secret reference" : "Edit secret reference"} onClose={() => { if (!saving) setEditing(null); }}>
        {editing ? (
          <form className="space-y-4" onSubmit={save}>
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <label className="block text-sm font-semibold">Name<Input className="mt-2" required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Environment variable<Input className="mt-2 font-mono uppercase" required pattern="[A-Z][A-Z0-9_]*" value={editing.envVar} onChange={(event) => setEditing({ ...editing, envVar: event.target.value.toUpperCase() })} /></label>
            <label className="block text-sm font-semibold">Service<Input className="mt-2" required value={editing.service} onChange={(event) => setEditing({ ...editing, service: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Secret Manager reference<Input className="mt-2 font-mono" value={editing.secretManagerRef ?? ""} onChange={(event) => setEditing({ ...editing, secretManagerRef: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Last rotated<Input className="mt-2" type="date" value={editing.lastRotatedAt?.slice(0, 10) ?? ""} onChange={(event) => setEditing({ ...editing, lastRotatedAt: event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString() : null })} /></label>
            <label className="block text-sm font-semibold">Operator notes<Textarea className="mt-2" rows={4} value={editing.notes ?? ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label>
            <p className="text-sm leading-6 text-brand-muted">Do not paste tokens, passwords, or private keys into any field.</p>
            <Button type="submit" loading={saving}>{editing.isNew ? "Add reference" : "Save reference"}</Button>
          </form>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this reference?"
        description="This removes RashPOD’s documentation record only. It does not delete or rotate the credential in Google Cloud."
        confirmLabel="Delete reference"
        confirmationText={deleting?.envVar}
        loading={saving}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </PageShell>
  );
}
