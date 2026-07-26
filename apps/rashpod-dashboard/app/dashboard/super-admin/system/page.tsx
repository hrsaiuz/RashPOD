"use client";

import { FormEvent, useEffect, useState } from "react";
import { CloudCog, RefreshCw } from "lucide-react";
import { Button, Card, ErrorState, Input, Skeleton } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell } from "../super-admin-ui";

type SystemSettings = { companyName?: string; supportEmail?: string; metadata?: unknown };
type SystemHealth = {
  environment?: unknown;
  launchReadiness?: unknown;
  worker?: { pending: number; failed: number };
  tenants?: number;
};

export default function SuperAdminSystemPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [settingsData, healthData] = await Promise.all([
        api.get<SystemSettings>("/super-admin/system/settings"),
        api.get<SystemHealth>("/super-admin/system/health"),
      ]);
      setSettings(settingsData);
      setHealth(healthData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load system data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function reviewSave(event: FormEvent) {
    event.preventDefault();
    setConfirming(true);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await api.patch<SystemSettings>("/super-admin/system/settings", {
        companyName: settings.companyName?.trim(),
        supportEmail: settings.supportEmail?.trim(),
      });
      setSettings(updated);
      setFeedback({ kind: "success", message: "Platform settings saved." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not save system settings" });
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <PageShell
      title="System health"
      description="Platform identity, launch readiness, environment validation, and worker queue signals."
      icon={<CloudCog size={22} />}
      action={<Button variant="secondary" onClick={() => void load()} aria-label="Refresh system data"><RefreshCw size={16} aria-hidden="true" /></Button>}
    >
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
      {loading ? <Skeleton className="h-72" /> : loadError ? (
        <ErrorState title="Could not load system data" description={loadError} retry={<Button onClick={() => void load()}>Retry</Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={reviewSave}>
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Platform identity</h2>
                <p className="mt-1 text-sm leading-6 text-brand-muted">Used by shared operational and customer-facing communications.</p>
              </div>
              <label className="block text-sm font-semibold">Company name<Input className="mt-2" required value={settings?.companyName ?? ""} onChange={(event) => setSettings((current) => ({ ...(current ?? {}), companyName: event.target.value }))} /></label>
              <label className="block text-sm font-semibold">Support email<Input className="mt-2" required type="email" autoComplete="email" value={settings?.supportEmail ?? ""} onChange={(event) => setSettings((current) => ({ ...(current ?? {}), supportEmail: event.target.value }))} /></label>
              <Button type="submit" loading={saving}>Review settings</Button>
            </Card>
          </form>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><p className="text-sm text-brand-muted">Worker pending</p><p className="mt-2 text-3xl font-bold tabular-nums">{health?.worker?.pending ?? 0}</p></Card>
              <Card><p className="text-sm text-brand-muted">Worker failed</p><p className="mt-2 text-3xl font-bold tabular-nums text-semantic-dangerText">{health?.worker?.failed ?? 0}</p></Card>
              <Card><p className="text-sm text-brand-muted">Tenants</p><p className="mt-2 text-3xl font-bold tabular-nums">{health?.tenants ?? 0}</p></Card>
            </div>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Launch readiness</h2>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-app p-3 text-xs leading-5">{JSON.stringify(health?.launchReadiness ?? {}, null, 2)}</pre>
            </Card>
            <details className="rounded-2xl border border-brand-line bg-white p-4 shadow-soft">
              <summary className="cursor-pointer font-semibold text-brand-ink">Environment validation details</summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-app p-3 text-xs leading-5">{JSON.stringify(health?.environment ?? {}, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Save platform settings?"
        description={<span>Company name will be <strong>{settings?.companyName || "empty"}</strong> and support email will be <strong>{settings?.supportEmail || "empty"}</strong>.</span>}
        confirmLabel="Save settings"
        danger={false}
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void save()}
      />
    </PageShell>
  );
}
