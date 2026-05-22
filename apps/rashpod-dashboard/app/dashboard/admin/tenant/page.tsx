"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, HardDrive, Users } from "lucide-react";
import { Button, ErrorState } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type TenantDetails = {
  id: string;
  name: string;
  slug: string;
  status: string;
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
  plan?: { name: string; code: string } | null;
  branding?: { displayName?: string | null; accentColor?: string | null } | null;
};

type Usage = {
  users: number;
  designs: number;
  listings: number;
  orders: number;
  productionJobs: number;
  storageBytes: number;
};

type Member = {
  id: string;
  roleKey: string;
  status: string;
  user: { email: string; displayName: string; role: string };
};

export default function TenantAdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/admin/tenant");
      return;
    }

    Promise.all([
      fetch("/api/proxy/tenant/current").then(assertJson),
      fetch("/api/proxy/tenant/usage").then(assertJson),
      fetch("/api/proxy/tenant/members").then(assertJson),
    ])
      .then(([tenantData, usageData, memberData]) => {
        setTenant(tenantData as TenantDetails);
        setUsage(usageData as Usage);
        setMembers(Array.isArray(memberData) ? memberData as Member[] : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Tenant settings unavailable."));
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="admin">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Tenant Settings</h1>
          <p className="text-sm text-brand-muted">Workspace identity, usage, plan visibility, and member access.</p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/dashboard/admin/branding")}>Branding</Button>
      </div>

      {error ? <ErrorState title="Tenant unavailable" description={error} /> : null}
      {!tenant && !error ? <div className="rounded-xl border border-brand-line bg-white p-5 text-sm text-brand-muted">Loading tenant context...</div> : null}

      {tenant ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-brand-blue"><Building2 size={18} /><span className="text-xs font-bold uppercase">Workspace</span></div>
                <h2 className="text-xl font-bold text-brand-ink">{tenant.name}</h2>
                <p className="text-sm text-brand-muted">/{tenant.slug} · {tenant.defaultCurrency} · {tenant.defaultLocale} · {tenant.timezone}</p>
              </div>
              <span className="rounded-pill bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">{tenant.status}</span>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Metric icon={Users} label="Users" value={usage?.users ?? 0} />
            <Metric icon={CreditCard} label="Orders" value={usage?.orders ?? 0} />
            <Metric icon={HardDrive} label="Storage" value={`${Math.round((usage?.storageBytes ?? 0) / 1024 / 1024)} MB`} />
          </div>

          <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold text-brand-ink">Members</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-brand-line text-left text-xs text-brand-muted">
                    <th className="py-2 pr-4 font-semibold">User</th>
                    <th className="py-2 pr-4 font-semibold">Role</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-brand-line/60">
                      <td className="py-3 pr-4 text-brand-ink">{member.user.displayName || member.user.email}<div className="text-xs text-brand-muted">{member.user.email}</div></td>
                      <td className="py-3 pr-4 text-brand-muted">{member.roleKey}</td>
                      <td className="py-3 pr-4"><span className="rounded-pill bg-surface-borderSoft px-2 py-1 text-xs font-semibold text-brand-muted">{member.status}</span></td>
                    </tr>
                  ))}
                  {members.length === 0 ? <tr><td colSpan={3} className="py-6 text-center text-brand-muted">No members found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

async function assertJson(res: Response) {
  if (res.status === 401 || res.status === 403) throw new Error("You do not have access to this tenant area.");
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  return res.json();
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-soft">
      <Icon size={18} className="mb-3 text-brand-blue" />
      <div className="text-2xl font-bold text-brand-ink">{value}</div>
      <div className="text-sm text-brand-muted">{label}</div>
    </div>
  );
}
