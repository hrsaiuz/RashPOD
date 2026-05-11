"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, Button } from "@rashpod/ui";
import {
  ShoppingBag,
  Palette,
  Briefcase,
  ShieldCheck,
  Factory,
  Settings,
  Crown,
  ArrowRight,
} from "lucide-react";

interface RoleEntry {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: "blue" | "peach" | "green" | "ink";
}

const ACCENT_BG: Record<RoleEntry["accent"], string> = {
  blue: "bg-brand-blueLight text-brand-blue",
  peach: "bg-brand-peachLight text-brand-peach",
  green: "bg-semantic-successBg text-semantic-successText",
  ink: "bg-surface-borderSoft text-brand-ink",
};

const ROLES: RoleEntry[] = [
  {
    slug: "customer",
    title: "Customer",
    description: "Orders, wishlist and addresses.",
    icon: <ShoppingBag size={18} aria-hidden="true" />,
    accent: "blue",
  },
  {
    slug: "designer",
    title: "Designer",
    description: "Designs, listings, royalties, film rights.",
    icon: <Palette size={18} aria-hidden="true" />,
    accent: "peach",
  },
  {
    slug: "corporate",
    title: "Corporate",
    description: "Bulk requests, offers, approvals.",
    icon: <Briefcase size={18} aria-hidden="true" />,
    accent: "blue",
  },
  {
    slug: "moderator",
    title: "Moderator",
    description: "Review designs and listings against policy.",
    icon: <ShieldCheck size={18} aria-hidden="true" />,
    accent: "peach",
  },
  {
    slug: "production",
    title: "Production",
    description: "Print queues, QC, packing and pickup.",
    icon: <Factory size={18} aria-hidden="true" />,
    accent: "green",
  },
  {
    slug: "admin",
    title: "Admin",
    description: "Catalog, pricing, delivery, payouts.",
    icon: <Settings size={18} aria-hidden="true" />,
    accent: "ink",
  },
  {
    slug: "super-admin",
    title: "Super admin",
    description: "Users, roles, AI settings, audit logs.",
    icon: <Crown size={18} aria-hidden="true" />,
    accent: "ink",
  },
];

export default function DashboardHome() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 py-10 md:py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 max-w-2xl"
      >
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-2">
          RashPOD Dashboards
        </p>
        <h1 className="text-[clamp(24px,3vw,32px)] font-bold leading-[1.15] text-brand-ink mb-2">
          Choose your workspace
        </h1>
        <p className="text-[15px] text-brand-muted leading-relaxed">
          Each role has a dedicated dashboard with the tools, queues and metrics
          they need.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map((role, i) => (
          <motion.div
            key={role.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/dashboard/${role.slug}`}
              className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
              aria-label={`Open ${role.title} dashboard`}
            >
              <Card variant="flat" className="h-full !p-5 hover:shadow-soft transition-shadow">
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg mb-4 ${ACCENT_BG[role.accent]}`}
                >
                  {role.icon}
                </div>
                <h2 className="text-base font-semibold text-brand-ink mb-1">
                  {role.title}
                </h2>
                <p className="text-[13px] text-brand-muted leading-relaxed mb-4">
                  {role.description}
                </p>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-blue group-hover:gap-1.5 transition-[gap]">
                  Open dashboard
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link href="/auth/login">
          <Button variant="primaryBlue" size="md">
            Sign in
          </Button>
        </Link>
        <Link href="/auth/register">
          <Button variant="secondary" size="md">
            Create an account
          </Button>
        </Link>
      </div>
    </main>
  );
}
