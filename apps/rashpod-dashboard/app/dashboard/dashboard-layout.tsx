"use client";

import { ReactNode, useMemo } from "react";
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
  Factory,
  Image as ImageIcon,
  Layers,
  Film,
} from "lucide-react";

const ROLE_LINKS: Record<string, Array<{ href: string; label: string; icon?: any }>> = {
  designer: [
    { href: "/dashboard/designer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/designer/designs", label: "My Designs", icon: ImageIcon },
    { href: "/dashboard/designer/mockup-studio", label: "Mockup Studio", icon: Layers },
    { href: "/dashboard/designer/listings", label: "My Listings", icon: Tag },
    { href: "/dashboard/designer/film-rights", label: "Film Rights", icon: Film },
    { href: "/dashboard/designer/corporate-bids", label: "Corporate Bids", icon: Briefcase },
    { href: "/dashboard/designer/royalties", label: "Royalties", icon: DollarSign },
    { href: "/dashboard/designer/settings", label: "Settings", icon: Settings },
  ],
  customer: [],
  production: [
    { href: "/dashboard/production", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/production/jobs", label: "Production Queue", icon: Factory },
  ],
  corporate: [],
  moderator: [
    { href: "/dashboard/moderator", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/moderator/designs", label: "Moderation Queue", icon: Search },
  ],
  finance: [
    { href: "/dashboard/finance", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/finance/royalties", label: "Royalties", icon: DollarSign },
    { href: "/dashboard/finance/payments", label: "Payments", icon: CreditCard },
  ],
  support: [
    { href: "/dashboard/support", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/support/tickets", label: "Tickets", icon: Ticket },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/orders", label: "Orders", icon: Package },
    { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: Settings },
    { href: "/dashboard/admin/delivery-settings", label: "Delivery", icon: Package },
    { href: "/dashboard/admin/corporate", label: "Corporate", icon: Briefcase },
  ],
  "super-admin": [
    { href: "/dashboard/super-admin", label: "Overview", icon: LayoutDashboard },
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

export default function DashboardLayout({ children, role }: { children: ReactNode; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuth();

  const links: DashboardLink[] = useMemo(() => {
    return (ROLE_LINKS[role] ?? []).map((l) => ({
      href: l.href,
      label: l.label,
      icon: l.icon,
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
    >
      {children}
    </DashboardShell>
  );
}
