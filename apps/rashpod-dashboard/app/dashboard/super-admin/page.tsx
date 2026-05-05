"use client";

import Link from "next/link";
import DashboardLayout from "../dashboard-layout";

const CONTROL_SECTIONS = [
  { href: "/dashboard/admin/orders", label: "All Orders", icon: "📦", color: "#EEF0FB" },
  { href: "/dashboard/admin/worker-jobs", label: "Worker Jobs", icon: "⚙️", color: "#EEF0FB" },
  { href: "/dashboard/moderator/designs", label: "Moderation", icon: "🔍", color: "#FEF3C7" },
  { href: "/dashboard/finance/royalties", label: "Royalties", icon: "💸", color: "#D1FAE5" },
  { href: "/dashboard/finance/payments", label: "Payments", icon: "💳", color: "#D1FAE5" },
  { href: "/dashboard/super-admin/roles", label: "Roles & Users", icon: "👥", color: "#EEF0FB" },
  { href: "/dashboard/super-admin/audit-logs", label: "Audit Logs", icon: "📝", color: "#FEE2E2" },
  { href: "/dashboard/super-admin/permissions", label: "Permissions", icon: "🔐", color: "#FEE2E2" },
  { href: "/dashboard/super-admin/system", label: "System Health", icon: "🖥️", color: "#EEF0FB" },
  { href: "/dashboard/super-admin/secrets", label: "Secrets / Config", icon: "🔑", color: "#FEE2E2" },
];

export default function SuperAdminPage() {
  return (
    <DashboardLayout role="super-admin">
      <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1A1D2E" }}>Super Admin</h1>
      <p style={{ margin: "0 0 24px", color: "#6B7280", fontSize: 14 }}>Global platform controls. Handle with care.</p>

      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 16px", marginBottom: 24, fontSize: 13, color: "#991B1B" }}>
        ⚠️ Actions taken here affect all users and all services. Review before making changes.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {CONTROL_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: "16px 18px", cursor: "pointer", transition: "box-shadow .15s, border-color .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(120,138,224,0.14)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#788AE0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "#E8EAFB"; }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>
                {s.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1D2E" }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

