"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FormField, Input, Skeleton, Textarea } from "@rashpod/ui";
import { Save, User as UserIcon, CreditCard, Bell } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type Tab = "profile" | "payout" | "notifications";

export default function DesignerSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/settings");
      return;
    }
    setDisplayName(user.displayName ?? "");
  }, [user, authLoading, router]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch("/auth/me", { displayName });
      setMessage({ kind: "ok", text: "Profile saved." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) return <DashboardLayout role="designer"><Skeleton className="h-40" /></DashboardLayout>;

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Settings</h1>
          <p className="text-brand-muted mt-1">Manage your profile, payouts and notifications.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={<UserIcon size={14} />} label="Profile" />
          <TabBtn active={tab === "payout"} onClick={() => setTab("payout")} icon={<CreditCard size={14} />} label="Payout" />
          <TabBtn active={tab === "notifications"} onClick={() => setTab("notifications")} icon={<Bell size={14} />} label="Notifications" />
        </div>

        {tab === "profile" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Profile</h2>
            <div className="space-y-4">
              <FormField label="Email" helperText="Contact support to change your email.">
                <Input value={user.email} disabled />
              </FormField>
              <FormField label="Display name">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </FormField>
              <FormField label="Bio" helperText="Public profile bio (coming with v1.1).">
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} disabled placeholder="Tell customers about yourself…" />
              </FormField>
              {message && (
                <p className={"text-sm " + (message.kind === "ok" ? "text-semantic-success" : "text-semantic-danger")}>
                  {message.text}
                </p>
              )}
              <Button variant="primaryBlue" loading={saving} onClick={saveProfile}>
                <Save size={16} /> Save changes
              </Button>
            </div>
          </Card>
        )}

        {tab === "payout" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Payout details</h2>
            <p className="text-sm text-brand-muted mb-4">
              Click wallet / bank account onboarding ships with v1.1. For now, contact admin to update payout details.
            </p>
            <div className="space-y-4 opacity-60 pointer-events-none">
              <FormField label="Click wallet phone"><Input placeholder="+998 90 123 45 67" disabled /></FormField>
              <FormField label="Bank card (UZS)"><Input placeholder="8600 •••• •••• ••••" disabled /></FormField>
              <FormField label="Tax ID / INN"><Input placeholder="000000000" disabled /></FormField>
            </div>
          </Card>
        )}

        {tab === "notifications" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Notifications</h2>
            <p className="text-sm text-brand-muted mb-4">
              Email notifications are sent for key events. Per-event toggles ship with v1.1.
            </p>
            <ul className="space-y-2 text-sm text-brand-ink">
              <li className="flex justify-between px-4 py-3 rounded-xl bg-surface-card"><span>Design approved / rejected</span><span className="text-semantic-success font-semibold">On</span></li>
              <li className="flex justify-between px-4 py-3 rounded-xl bg-surface-card"><span>Bid status updates</span><span className="text-semantic-success font-semibold">On</span></li>
              <li className="flex justify-between px-4 py-3 rounded-xl bg-surface-card"><span>Royalty paid</span><span className="text-semantic-success font-semibold">On</span></li>
              <li className="flex justify-between px-4 py-3 rounded-xl bg-surface-card"><span>Marketing emails</span><span className="text-brand-muted font-semibold">Off</span></li>
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 px-4 h-9 rounded-pill text-sm font-semibold " +
        (active ? "bg-brand-blue text-white" : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
      }
    >
      {icon} {label}
    </button>
  );
}
