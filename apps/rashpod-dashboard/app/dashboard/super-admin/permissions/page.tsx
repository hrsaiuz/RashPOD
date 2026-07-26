"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { Button, Card, ErrorState, Skeleton } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell } from "../super-admin-ui";

const PLATFORM_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "MODERATOR",
  "PRODUCTION_STAFF",
  "FINANCE_STAFF",
  "SUPPORT_STAFF",
  "DESIGNER",
  "CUSTOMER",
  "CORPORATE_CLIENT",
] as const;

const RECOVERY_PERMISSIONS = new Set([
  "super-admin:rbac-manage",
  "super-admin:users-manage",
  "super-admin:secrets-manage",
  "super-admin:system-manage",
]);

type Matrix = {
  defaults: Record<string, string[]>;
  overrides: Record<string, string[]>;
  effective: Record<string, string[]>;
};

export default function SuperAdminPermissionsPage() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmation, setConfirmation] = useState<"save" | "reset" | null>(null);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.get<Matrix>("/super-admin/rbac/permissions");
      setMatrix(data);
      setDraft(data.effective);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load permissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const permissions = useMemo(() => Object.keys(draft).sort(), [draft]);
  const changedCount = useMemo(() => {
    if (!matrix) return 0;
    return Object.entries(draft).filter(([permission, roles]) => {
      const effective = matrix.effective[permission] ?? [];
      return roles.length !== effective.length || roles.some((role) => !effective.includes(role));
    }).length;
  }, [draft, matrix]);

  function toggle(permission: string, role: string) {
    if (role === "SUPER_ADMIN" && RECOVERY_PERMISSIONS.has(permission)) return;
    setDraft((current) => {
      const roles = new Set(current[permission] ?? []);
      if (roles.has(role)) roles.delete(role);
      else roles.add(role);
      return { ...current, [permission]: [...roles] };
    });
  }

  async function persist(mode: "save" | "reset") {
    if (!matrix) return;
    setSaving(true);
    setFeedback(null);
    try {
      const overrides: Record<string, string[]> = {};
      if (mode === "save") {
        for (const [permission, roles] of Object.entries(draft)) {
          const defaults = matrix.defaults[permission] ?? [];
          const matchesDefault = defaults.length === roles.length && defaults.every((role) => roles.includes(role));
          if (!matchesDefault) overrides[permission] = roles;
        }
      }
      await api.patch("/super-admin/rbac/permissions", { overrides });
      await load();
      setFeedback({ kind: "success", message: mode === "reset" ? "Permission overrides reset to code defaults." : "RBAC overrides saved and applied." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not update permissions" });
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  }

  return (
    <PageShell
      title="Permissions"
      description="Review the effective access matrix. Critical recovery permissions always remain available to super admins."
      icon={<Shield size={22} />}
      action={(
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void load()} aria-label="Refresh permissions"><RefreshCw size={16} aria-hidden="true" /></Button>
          <Button variant="secondary" disabled={!matrix || saving} onClick={() => setConfirmation("reset")}>Reset defaults</Button>
          <Button disabled={!changedCount || saving} onClick={() => setConfirmation("save")}>
            Save changes{changedCount ? ` (${changedCount})` : ""}
          </Button>
        </div>
      )}
    >
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className="rounded-2xl border border-semantic-infoBg bg-semantic-infoBg p-4 text-sm leading-6 text-semantic-infoText">
        Locked checkboxes preserve the platform recovery path. Every saved change is audit logged.
      </div>
      {loading ? <Skeleton className="h-96" /> : loadError ? (
        <ErrorState title="Could not load permissions" description={loadError} retry={<Button onClick={() => void load()}>Retry</Button>} />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[960px] text-xs">
            <caption className="sr-only">Effective role permissions</caption>
            <thead className="bg-surface-app text-brand-muted">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface-app px-4 py-3 text-left">Permission</th>
                {PLATFORM_ROLES.map((role) => <th scope="col" key={role} className="px-2 py-3 text-center">{role.replace(/_/g, " ")}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {permissions.map((permission) => (
                <tr key={permission} className="hover:bg-surface-app/60">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-mono text-[11px]">{permission}</th>
                  {PLATFORM_ROLES.map((role) => {
                    const locked = role === "SUPER_ADMIN" && RECOVERY_PERMISSIONS.has(permission);
                    return (
                      <td key={role} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${permission} for ${role.replace(/_/g, " ")}`}
                          checked={(draft[permission] ?? []).includes(role)}
                          disabled={locked}
                          title={locked ? "Required recovery permission" : undefined}
                          onChange={() => toggle(permission, role)}
                          className="h-5 w-5 rounded border-brand-line text-brand-blue focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <ConfirmDialog
        open={confirmation === "save"}
        title="Apply RBAC changes?"
        description={`${changedCount} permission ${changedCount === 1 ? "rule" : "rules"} will change immediately for all users. Existing sessions will use the new matrix on their next request.`}
        confirmLabel="Apply changes"
        confirmationText="APPLY"
        loading={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void persist("save")}
      />
      <ConfirmDialog
        open={confirmation === "reset"}
        title="Reset all permission overrides?"
        description="Every configured override will be removed and the code defaults will take effect immediately."
        confirmLabel="Reset overrides"
        confirmationText="RESET"
        loading={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void persist("reset")}
      />
    </PageShell>
  );
}
