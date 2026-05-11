"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FormField, Input, Skeleton, Textarea } from "@rashpod/ui";
import { Save, User as UserIcon, CreditCard, Bell, Link as LinkIcon } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type Tab = "profile" | "portfolio" | "payout" | "notifications";

type MeResponse = {
  id: string;
  email: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  handle?: string | null;
  socialLinks?: Record<string, string> | null;
  preferences?: {
    portfolioJson?: Record<string, string> | null;
    payoutDetailsJson?: Record<string, string> | null;
    notificationJson?: Record<string, boolean> | null;
  } | null;
};

const notificationDefaults = {
  designApproved: true,
  bidReceived: true,
  royaltyPaid: true,
  marketing: false,
};

export default function DesignerSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [behance, setBehance] = useState("");
  const [languages, setLanguages] = useState("");
  const [clickWallet, setClickWallet] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notifications, setNotifications] = useState(notificationDefaults);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/settings");
      return;
    }
    void loadProfile();
  }, [user, authLoading, router]);

  async function loadProfile() {
    setLoadingProfile(true);
    try {
      const me = await api.get<MeResponse>("/auth/me");
      const social = me.socialLinks ?? {};
      const portfolio = me.preferences?.portfolioJson ?? {};
      const payout = me.preferences?.payoutDetailsJson ?? {};
      const notify = me.preferences?.notificationJson ?? {};
      setProfile(me);
      setDisplayName(me.displayName ?? "");
      setBio(me.bio ?? "");
      setAvatarUrl(me.avatarUrl ?? "");
      setCoverUrl(me.coverUrl ?? "");
      setWebsite(social.website ?? portfolio.website ?? "");
      setInstagram(social.instagram ?? portfolio.instagram ?? "");
      setBehance(social.behance ?? portfolio.behance ?? "");
      setLanguages(portfolio.languages ?? "");
      setClickWallet(payout.clickWallet ?? "");
      setBankAccount(payout.bankAccount ?? "");
      setTaxId(payout.taxId ?? "");
      setNotifications({ ...notificationDefaults, ...notify });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Could not load profile" });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    try {
      const socialLinks = compactStrings({ website, instagram, behance });
      const portfolio = compactStrings({ website, instagram, behance, languages });
      const payoutDetails = compactStrings({ clickWallet, bankAccount, taxId });
      const updated = await api.patch<MeResponse>("/auth/me", {
        displayName,
        bio,
        avatarUrl,
        coverUrl,
        socialLinks,
        portfolio,
        payoutDetails,
        notifications,
      });
      setProfile(updated);
      setMessage({ kind: "ok", text: "Settings saved." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || loadingProfile) return <DashboardLayout role="designer"><Skeleton className="h-40" /></DashboardLayout>;

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Settings</h1>
          <p className="text-brand-muted mt-1">Manage your profile, payouts and notifications.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={<UserIcon size={14} />} label="Profile" />
          <TabBtn active={tab === "portfolio"} onClick={() => setTab("portfolio")} icon={<LinkIcon size={14} />} label="Portfolio" />
          <TabBtn active={tab === "payout"} onClick={() => setTab("payout")} icon={<CreditCard size={14} />} label="Payout" />
          <TabBtn active={tab === "notifications"} onClick={() => setTab("notifications")} icon={<Bell size={14} />} label="Notifications" />
        </div>

        {tab === "profile" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Profile</h2>
            <div className="space-y-4">
              <FormField label="Email" helperText="Contact support to change your email.">
                <Input value={profile?.email ?? user.email} disabled />
              </FormField>
              <FormField label="Handle" helperText="Generated from your public name. Contact support if it needs to change.">
                <Input value={profile?.handle ? `@${profile.handle}` : "Generating on save"} disabled />
              </FormField>
              <FormField label="Display name">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </FormField>
              <FormField label="Bio" helperText="Shown on your public designer profile.">
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your style, process, and product focus." />
              </FormField>
              <FormField label="Avatar URL" helperText="Use a signed media URL or public image URL. File upload is handled in Media Library.">
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </FormField>
              <FormField label="Cover image URL">
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
              </FormField>
              <Feedback message={message} />
              <Button variant="primaryBlue" loading={saving} onClick={saveSettings}>
                <Save size={16} /> Save changes
              </Button>
            </div>
          </Card>
        )}

        {tab === "portfolio" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Portfolio</h2>
            <div className="space-y-4">
              <FormField label="Website">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-site.uz" />
              </FormField>
              <FormField label="Instagram">
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
              </FormField>
              <FormField label="Behance">
                <Input value={behance} onChange={(e) => setBehance(e.target.value)} placeholder="https://behance.net/..." />
              </FormField>
              <FormField label="Languages spoken">
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Uzbek, Russian, English" />
              </FormField>
              <Feedback message={message} />
              <Button variant="primaryBlue" loading={saving} onClick={saveSettings}>
                <Save size={16} /> Save portfolio
              </Button>
            </div>
          </Card>
        )}

        {tab === "payout" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Payout details</h2>
            <p className="text-sm text-brand-muted mb-4">
              Payout details are private and visible only to authorized operations staff.
            </p>
            <div className="space-y-4">
              <FormField label="Click wallet phone"><Input value={clickWallet} onChange={(e) => setClickWallet(e.target.value)} placeholder="+998 90 123 45 67" /></FormField>
              <FormField label="Bank card / account"><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="8600 .... .... ...." /></FormField>
              <FormField label="Tax ID / INN"><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="000000000" /></FormField>
              <Feedback message={message} />
              <Button variant="primaryBlue" loading={saving} onClick={saveSettings}>
                <Save size={16} /> Save payout details
              </Button>
            </div>
          </Card>
        )}

        {tab === "notifications" && (
          <Card>
            <h2 className="text-lg font-semibold text-brand-ink mb-4">Notifications</h2>
            <div className="space-y-2 text-sm text-brand-ink">
              <Toggle label="Design approved / rejected" checked={notifications.designApproved} onChange={(value) => setNotifications((p) => ({ ...p, designApproved: value }))} />
              <Toggle label="Bid status updates" checked={notifications.bidReceived} onChange={(value) => setNotifications((p) => ({ ...p, bidReceived: value }))} />
              <Toggle label="Royalty paid" checked={notifications.royaltyPaid} onChange={(value) => setNotifications((p) => ({ ...p, royaltyPaid: value }))} />
              <Toggle label="Marketing emails" checked={notifications.marketing} onChange={(value) => setNotifications((p) => ({ ...p, marketing: value }))} />
              <Feedback message={message} />
              <Button variant="primaryBlue" loading={saving} onClick={saveSettings}>
                <Save size={16} /> Save notifications
              </Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function compactStrings(input: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  );
}

function Feedback({ message }: { message: { kind: "ok" | "err"; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={"text-sm " + (message.kind === "ok" ? "text-semantic-success" : "text-semantic-danger")}>
      {message.text}
    </p>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-card cursor-pointer">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand-blue"
      />
    </label>
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
