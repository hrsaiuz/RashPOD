"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "../auth/auth-provider";
import { useRouter } from "next/navigation";

const ROLE_LINKS: Record<string, Array<{ href: string; label: string; icon: string }>> = {
  designer: [
    { href: "/dashboard/designer", label: "Overview", icon: "📊" },
    { href: "/dashboard/designer/listings", label: "My Listings", icon: "🏷️" },
  ],
  customer: [
    { href: "/dashboard/customer", label: "Overview", icon: "📊" },
    { href: "/dashboard/customer/shop", label: "Browse Shop", icon: "🛒" },
    { href: "/dashboard/customer/orders", label: "My Orders", icon: "📦" },
  ],
  production: [
    { href: "/dashboard/production", label: "Overview", icon: "📊" },
    { href: "/dashboard/production/jobs", label: "Production Queue", icon: "🏭" },
  ],
  corporate: [
    { href: "/dashboard/corporate", label: "Overview", icon: "📊" },
    { href: "/dashboard/corporate/requests", label: "Requests", icon: "📋" },
  ],
  moderator: [
    { href: "/dashboard/moderator", label: "Overview", icon: "📊" },
    { href: "/dashboard/moderator/designs", label: "Moderation Queue", icon: "🔍" },
  ],
  finance: [
    { href: "/dashboard/finance", label: "Overview", icon: "📊" },
    { href: "/dashboard/finance/royalties", label: "Royalties", icon: "💸" },
    { href: "/dashboard/finance/payments", label: "Payments", icon: "💳" },
  ],
  support: [
    { href: "/dashboard/support", label: "Overview", icon: "📊" },
    { href: "/dashboard/support/tickets", label: "Tickets", icon: "🎫" },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: "📊" },
    { href: "/dashboard/admin/orders", label: "Orders", icon: "📦" },
    { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: "⚙️" },
    { href: "/dashboard/admin/delivery-settings", label: "Delivery", icon: "🚚" },
    { href: "/dashboard/admin/corporate", label: "Corporate", icon: "🏢" },
  ],
  "super-admin": [
    { href: "/dashboard/super-admin", label: "Overview", icon: "📊" },
    { href: "/dashboard/admin/orders", label: "All Orders", icon: "📦" },
    { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: "⚙️" },
    { href: "/dashboard/moderator/designs", label: "Moderation", icon: "🔍" },
    { href: "/dashboard/finance/royalties", label: "Royalties", icon: "💸" },
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
  const links = ROLE_LINKS[role] ?? [];

  const handleLogout = async () => {
    await clearSession();
    router.push("/auth/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 0px)" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "white", borderRight: "1px solid #E8EAFB", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #F0F2FA" }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 17, color: "#788AE0", textDecoration: "none", letterSpacing: -0.5 }}>RashPOD</Link>
          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: "#A3AFE5", textTransform: "uppercase", letterSpacing: 1 }}>
            {ROLE_LABELS[role] ?? role}
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== `/dashboard/${role}` && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#788AE0" : "#4B5563", background: active ? "#EEF0FB" : "transparent", marginBottom: 2 }}>
                <span style={{ fontSize: 15 }}>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F2FA" }}>
          {user && (
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName || user.email}
            </div>
          )}
          <button onClick={handleLogout} style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #E8EAFB", background: "white", color: "#6B7280", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Topbar */}
        <header style={{ background: "white", borderBottom: "1px solid #E8EAFB", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, zIndex: 10 }}>
          <nav style={{ fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Dashboard</span>
            <span>›</span>
            <span style={{ color: "#374151", fontWeight: 500, textTransform: "capitalize" }}>{ROLE_LABELS[role] ?? role}</span>
          </nav>
        </header>
        <main style={{ padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}
