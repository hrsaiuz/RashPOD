"use client";

import Link from "next/link";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

const QUEUE_SECTIONS = [
  { href: "/dashboard/production/jobs", label: "All Jobs", icon: "📋", desc: "View and manage the full production queue" },
  { href: "/dashboard/production/pod", label: "POD Queue", icon: "👕", desc: "Print-on-demand garment jobs" },
  { href: "/dashboard/production/dtf", label: "DTF Queue", icon: "🎨", desc: "Direct-to-film print jobs" },
  { href: "/dashboard/production/uv-dtf", label: "UV-DTF Queue", icon: "✨", desc: "UV direct-to-film jobs" },
  { href: "/dashboard/production/qc", label: "QC", icon: "🔍", desc: "Quality control and inspection" },
  { href: "/dashboard/production/corporate", label: "Corporate Orders", icon: "🏢", desc: "Bulk and corporate production jobs" },
];

export default function ProductionPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout role="production">
      <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1A1D2E" }}>Production Dashboard</h1>
      <p style={{ margin: "0 0 24px", color: "#6B7280", fontSize: 14 }}>
        Welcome{user?.displayName ? `, ${user.displayName}` : ""}. Select a queue to manage.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {QUEUE_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 16, padding: "18px 20px", transition: "box-shadow .15s, border-color .15s", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(120,138,224,0.14)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#788AE0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "#E8EAFB"; }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1D2E", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

