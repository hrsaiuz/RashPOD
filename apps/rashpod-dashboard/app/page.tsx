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
    description: "Browse the shop, manage orders, wishlist and addresses.",
    icon: <ShoppingBag size={22} aria-hidden="true" />,
    accent: "blue",
  },
  {
    slug: "designer",
    title: "Designer",
    description: "Upload designs, manage listings, track royalties and film rights.",
    icon: <Palette size={22} aria-hidden="true" />,
    accent: "peach",
  },
  {
    slug: "corporate",
    title: "Corporate",
    description: "Submit bulk requests, review offers, manage approvals.",
    icon: <Briefcase size={22} aria-hidden="true" />,
    accent: "blue",
  },
  {
    slug: "moderator",
    title: "Moderator",
    description: "Review designs and listings against policy.",
    icon: <ShieldCheck size={22} aria-hidden="true" />,
    accent: "peach",
  },
  {
    slug: "production",
    title: "Production",
    description: "Print, DTF and UV-DTF queues, QC, packing and pickup.",
    icon: <Factory size={22} aria-hidden="true" />,
    accent: "green",
  },
  {
    slug: "admin",
    title: "Admin",
    description: "Catalog, pricing, delivery, corporate, payouts.",
    icon: <Settings size={22} aria-hidden="true" />,
    accent: "ink",
  },
  {
    slug: "super-admin",
    title: "Super admin",
    description: "Users, roles, AI settings, audit logs and system config.",
    icon: <Crown size={22} aria-hidden="true" />,
    accent: "ink",
  },
];

export default function DashboardHome() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 md:py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 max-w-2xl"
      >
        <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-3">
          RashPOD Dashboards
        </p>
        <h1 className="text-[clamp(32px,4vw,44px)] font-bold leading-[1.1] text-brand-ink mb-4">
          Choose your workspace
        </h1>
        <p className="text-lg text-brand-muted leading-relaxed">
          Each role has a dedicated dashboard with the tools, queues and metrics
          they need. Pick a workspace below to continue.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ROLES.map((role, i) => (
          <motion.div
            key={role.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/dashboard/${role.slug}`}
              className="group block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              aria-label={`Open ${role.title} dashboard`}
            >
              <Card variant="lift" className="h-full p-7">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5 ${ACCENT_BG[role.accent]}`}
                >
                  {role.icon}
                </div>
                <h2 className="text-xl font-semibold text-brand-ink mb-2">
                  {role.title}
                </h2>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">
                  {role.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue group-hover:gap-2.5 transition-[gap]">
                  Open dashboard
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
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
