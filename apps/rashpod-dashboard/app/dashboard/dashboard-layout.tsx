"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth/auth-provider";
import { DashboardShell, DashboardLink, BreadcrumbItem } from "@rashpod/ui";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  FileText,
  Search,
  DollarSign,
  CreditCard,
  LifeBuoy,
  Ticket,
  Settings,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Factory,
  Image as ImageIcon,
  Images,
  Palette,
  Users,
  Building2,
  Boxes,
  Layers,
  Film,
  User,
  CloudCog,
  BarChart3,
  Bell,
  CheckCircle,
  Landmark,
  ChevronDown,
  Banknote,
  ShieldCheck,
} from "lucide-react";

const ROLE_LINKS: Record<string, Array<{ href: string; label: string; icon?: any; group?: string }>> = {
  designer: [
    { href: "/dashboard/designer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/designer/designs", label: "My Designs", icon: ImageIcon },
    { href: "/dashboard/designer/mockup-studio", label: "Mockup Studio", icon: Layers },
    { href: "/dashboard/designer/listings", label: "My Listings", icon: Tag },
    { href: "/dashboard/designer/film-rights", label: "Film Rights", icon: Film },
    { href: "/dashboard/designer/film-sales", label: "Film Sales", icon: Film },
    { href: "/dashboard/designer/corporate-bids", label: "Corporate Bids", icon: Briefcase },
    { href: "/dashboard/designer/royalties", label: "Royalties", icon: DollarSign },
    { href: "/dashboard/designer/earnings", label: "Earnings", icon: DollarSign },
    { href: "/dashboard/designer/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/designer/support", label: "Support", icon: LifeBuoy },
    { href: "/dashboard/designer/settings", label: "Settings", icon: Settings },
  ],
  customer: [
    { href: "/dashboard/customer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/customer/orders", label: "Orders", icon: Package },
    { href: "/dashboard/customer/film-orders", label: "Film Orders", icon: Film },
    { href: "/dashboard/customer/profile", label: "Profile", icon: User },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/customer/support", label: "Support", icon: LifeBuoy },
  ],
  production: [
    { href: "/dashboard/production", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/production/jobs", label: "Production Queue", icon: Factory },
    { href: "/dashboard/production/mobile", label: "Workshop Mobile", icon: Factory },
    { href: "/dashboard/production/scan", label: "Scan", icon: Search },
    { href: "/dashboard/production/qc", label: "QC", icon: CheckCircle },
    { href: "/dashboard/production/packing", label: "Packing", icon: Package },
    { href: "/dashboard/production/delivery", label: "Delivery", icon: Package },
    { href: "/dashboard/production/pickup", label: "Pickup", icon: Package },
    { href: "/dashboard/production/issues", label: "Issues", icon: ClipboardList },
  ],
  corporate: [],
  moderator: [
    { href: "/dashboard/moderator", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/moderator/designs", label: "Moderation Queue", icon: Search },
  ],
  finance: [
    { href: "/dashboard/finance", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/finance/royalties", label: "Royalties", icon: DollarSign },
    { href: "/dashboard/finance/payouts", label: "Payouts", icon: Banknote },
    { href: "/dashboard/finance/reconciliation", label: "Reconciliation", icon: CreditCard },
    { href: "/dashboard/finance/payments", label: "Payments", icon: CreditCard },
  ],
  support: [
    { href: "/dashboard/support", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/support/tickets", label: "Tickets", icon: Ticket },
    { href: "/dashboard/support/crm", label: "CRM", icon: Users },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/orders", label: "Orders", icon: Package, group: "Operations" },
    { href: "/dashboard/admin/external-sales", label: "External Sales", icon: ClipboardList, group: "Operations" },
    { href: "/dashboard/admin/production", label: "Production", icon: Factory, group: "Operations" },
    { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: Settings, group: "Operations" },
    { href: "/dashboard/admin/delivery-settings", label: "Delivery", icon: Package, group: "Operations" },
    { href: "/dashboard/admin/product-types", label: "Product Types", icon: ShoppingBag, group: "Catalog" },
    { href: "/dashboard/admin/base-products", label: "Base Products", icon: Boxes, group: "Catalog" },
    { href: "/dashboard/admin/mockup-templates", label: "Mockup Templates", icon: Images, group: "Catalog" },
    { href: "/dashboard/admin/print-areas", label: "Print Areas", icon: Layers, group: "Catalog" },
    { href: "/dashboard/admin/pipeline-config", label: "Pipeline Config", icon: Layers, group: "Catalog" },
    { href: "/dashboard/admin/pod", label: "Global POD", icon: CloudCog, group: "Catalog" },
    { href: "/dashboard/admin/listings", label: "Listings", icon: Tag, group: "Catalog" },
    { href: "/dashboard/admin/media-library", label: "Media Library", icon: Images, group: "Catalog" },
    { href: "/dashboard/admin/branding", label: "Branding", icon: Palette, group: "Catalog" },
    { href: "/dashboard/admin/tenant", label: "Tenant", icon: Landmark, group: "Governance" },
    { href: "/dashboard/admin/designers", label: "Designers", icon: Users, group: "People" },
    { href: "/dashboard/admin/customers", label: "Customers", icon: Users, group: "People" },
    { href: "/dashboard/admin/corporate-clients", label: "Corporate Clients", icon: Building2, group: "People" },
    { href: "/dashboard/admin/users", label: "Users", icon: Users, group: "People" },
    { href: "/dashboard/support/tickets", label: "Support Tickets", icon: Ticket, group: "People" },
    { href: "/dashboard/support/crm", label: "CRM", icon: Users, group: "People" },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell, group: "People" },
    { href: "/dashboard/admin/designer-applications", label: "Applications", icon: ClipboardList, group: "Intake" },
    { href: "/dashboard/admin/contact-messages", label: "Messages", icon: MessageSquare, group: "Intake" },
    { href: "/dashboard/admin/custom-order-requests", label: "Custom Requests", icon: Briefcase, group: "Intake" },
    { href: "/dashboard/admin/royalty-rules", label: "Royalty Rules", icon: DollarSign, group: "Commerce" },
    { href: "/dashboard/admin/film-sale-settings", label: "Film Sale", icon: Film, group: "Commerce" },
    { href: "/dashboard/admin/payment-settings", label: "Payments", icon: CreditCard, group: "Commerce" },
    { href: "/dashboard/admin/currencies", label: "Currencies", icon: DollarSign, group: "Commerce" },
    { href: "/dashboard/admin/corporate", label: "Corporate", icon: Briefcase, group: "Corporate" },
    { href: "/dashboard/admin/corporate-requests", label: "Corporate Requests", icon: ClipboardList, group: "Corporate" },
    { href: "/dashboard/admin/commercial-offers", label: "Commercial Offers", icon: FileText, group: "Corporate" },
    { href: "/dashboard/admin/marketplace", label: "Marketplace", icon: ShoppingBag, group: "AI & Growth" },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3, group: "AI & Growth" },
    { href: "/dashboard/admin/email-templates", label: "Email Templates", icon: MessageSquare, group: "AI & Growth" },
    { href: "/dashboard/admin/ai-settings", label: "AI Settings", icon: Settings, group: "AI & Growth" },
    { href: "/dashboard/admin/ai-assist", label: "AI Assist", icon: Search, group: "AI & Growth" },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileText, group: "AI & Growth" },
    { href: "/dashboard/admin/launch-readiness", label: "Launch Readiness", icon: CheckCircle, group: "Governance" },
    { href: "/dashboard/admin/audit-logs", label: "Audit Logs", icon: ClipboardList, group: "Governance" },
  ],
  "super-admin": [
    { href: "/dashboard/super-admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/super-admin/tenants", label: "Tenants", icon: Landmark },
    { href: "/dashboard/super-admin/plans", label: "Plans", icon: CreditCard },
    { href: "/dashboard/super-admin/roles", label: "Roles", icon: Users },
    { href: "/dashboard/super-admin/permissions", label: "Permissions", icon: ShieldCheck },
    { href: "/dashboard/super-admin/secrets", label: "Secrets", icon: Settings },
    { href: "/dashboard/super-admin/system", label: "System", icon: CloudCog },
    { href: "/dashboard/super-admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
    { href: "/dashboard/admin/orders", label: "All Orders", icon: Package },
    { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: Settings },
    { href: "/dashboard/moderator/designs", label: "Moderation", icon: Search },
    { href: "/dashboard/finance/royalties", label: "Royalties", icon: DollarSign },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  designer: "Designer",
  customer: "Customer",
  production: "Production",
  corporate: "Corporate",
  moderator: "Moderator",
  finance: "Finance",
  support: "Support",
  admin: "Admin",
  "super-admin": "Super Admin",
};

interface PublicBranding {
  dashboardLogoUrl: string | null;
  theme?: { storeName?: string };
}

type TenantMembership = {
  id: string;
  roleKey: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan?: { name: string; code: string } | null;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

export default function DashboardLayout({ children, role }: { children: ReactNode; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [tenantError, setTenantError] = useState("");

  useEffect(() => {
    if (!API_URL) return;

    const controller = new AbortController();
    fetch(`${API_URL}/branding`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBranding(data))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Dashboard branding fetch failed", { message: error.message });
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    fetch("/api/proxy/tenants/my", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTenants(Array.isArray(data?.items) ? data.items : []))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setTenantError("Tenant context unavailable");
        }
      });

    return () => controller.abort();
  }, [user]);

  const links: DashboardLink[] = useMemo(() => {
    return (ROLE_LINKS[role] ?? []).map((l) => ({
      href: l.href,
      label: l.label,
      icon: l.icon,
      group: l.group,
    }));
  }, [role]);

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];

    if (segments.length > 1) {
      items.push({
        label: ROLE_LABELS[segments[1]] || segments[1],
        href: `/dashboard/${segments[1]}`,
      });
    }

    if (segments.length > 2) {
      for (let i = 2; i < segments.length; i++) {
        const label = segments[i].replace(/-/g, " ");
        items.push({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          href: `/dashboard/${segments.slice(1, i + 1).join("/")}`,
        });
      }
    }

    return items;
  }, [pathname]);

  const handleSignOut = async () => {
    await clearSession();
    router.push("/auth/login");
  };

  // Impersonation banner: when an admin/super-admin/ops user views a sidebar for a different role.
  const actualRole = (user?.role || "").toUpperCase();
  const isElevated = ["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"].includes(actualRole);
  const viewingRole = role.toUpperCase().replace("-", "_");
  const impersonating =
    isElevated &&
    viewingRole !== actualRole &&
    !(actualRole === "SUPER_ADMIN" && viewingRole === "ADMIN");
  const activeTenant = tenants[0]?.tenant;

  return (
    <DashboardShell
      role={ROLE_LABELS[role] || role}
      links={links}
      activePath={pathname}
      user={{
        name: user?.displayName || user?.email || "User",
        email: user?.email,
      }}
      onSignOut={handleSignOut}
      breadcrumbs={breadcrumbs}
      sidebarLogoUrl={branding?.dashboardLogoUrl ?? null}
      brandName={branding?.theme?.storeName || "RashPOD"}
    >
      {impersonating && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-semantic-warningBg bg-semantic-warningBg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-semantic-warningText">
            <span className="font-semibold">Admin view:</span> you're viewing the {ROLE_LABELS[role] || role} dashboard as
            an admin. Actions you take are logged with your admin identity.
          </div>
          <button
            onClick={() => router.push("/dashboard/admin")}
            className="min-h-11 shrink-0 rounded-pill bg-brand-ink px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            Exit to admin
          </button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 shadow-soft">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Workspace</p>
          <p className="text-sm font-semibold text-brand-ink">
            {activeTenant ? activeTenant.name : tenantError || "RashPOD"}
            {activeTenant?.plan ? <span className="ml-2 font-normal text-brand-muted">· {activeTenant.plan.name}</span> : null}
          </p>
        </div>
        {tenants.length > 1 ? (
          <button
            onClick={() => router.push("/dashboard/admin/tenant")}
            className="inline-flex items-center gap-2 rounded-pill border border-brand-blue/30 px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5"
          >
            Switch workspace <ChevronDown size={14} />
          </button>
        ) : null}
      </div>
      {children}
    </DashboardShell>
  );
}
