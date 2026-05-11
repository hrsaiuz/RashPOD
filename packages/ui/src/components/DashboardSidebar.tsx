"use client";

import * as React from "react";
import Link from "next/link";
import { motion as m } from "framer-motion";
import { cn } from "../lib/utils";
import { LucideIcon } from "lucide-react";

export interface DashboardLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

export interface DashboardSidebarProps {
  role: string;
  links: DashboardLink[];
  activePath: string;
  className?: string;
  /**
   * Optional override of the accent colour token. Falls back to a sensible
   * mapping derived from the role label.
   */
  accent?: "blue" | "peach" | "green" | "ink";
  /** Called after a nav item is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
}

const ACCENT_BY_ROLE: Record<string, NonNullable<DashboardSidebarProps["accent"]>> = {
  designer: "peach",
  customer: "blue",
  corporate: "blue",
  moderator: "peach",
  production: "green",
  finance: "blue",
  support: "blue",
  admin: "ink",
  "super admin": "ink",
};

const ACCENT_CLASSES: Record<NonNullable<DashboardSidebarProps["accent"]>, {
  dot: string;
  activeBg: string;
  activeText: string;
  bar: string;
  ring: string;
}> = {
  blue: {
    dot: "bg-brand-blue",
    activeBg: "bg-brand-blueLight",
    activeText: "text-brand-blue",
    bar: "bg-brand-blue",
    ring: "focus:ring-brand-blue/30",
  },
  peach: {
    dot: "bg-brand-peach",
    activeBg: "bg-brand-peachLight",
    activeText: "text-brand-peach",
    bar: "bg-brand-peach",
    ring: "focus:ring-brand-peach/30",
  },
  green: {
    dot: "bg-semantic-success",
    activeBg: "bg-semantic-successBg",
    activeText: "text-semantic-successText",
    bar: "bg-semantic-success",
    ring: "focus:ring-semantic-success/30",
  },
  ink: {
    dot: "bg-brand-ink",
    activeBg: "bg-surface-borderSoft",
    activeText: "text-brand-ink",
    bar: "bg-brand-ink",
    ring: "focus:ring-brand-ink/30",
  },
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  role,
  links,
  activePath,
  className,
  accent,
  onNavigate,
}) => {
  const resolvedAccent: NonNullable<DashboardSidebarProps["accent"]> =
    accent ?? ACCENT_BY_ROLE[role.toLowerCase()] ?? "blue";
  const a = ACCENT_CLASSES[resolvedAccent];

  return (
    <aside
      className={cn(
        "w-[260px] bg-white border-r border-surface-borderSoft h-full md:h-screen md:sticky md:top-0 overflow-y-auto",
        className
      )}
      aria-label={`${role} navigation`}
    >
      <div className="p-6">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-brand-blue tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded">
            RashPOD
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", a.dot)} aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-brand-muted">
            {role}
          </span>
        </div>

        <nav className="space-y-1" aria-label="Primary">
          {links.map((link) => {
            const isActive =
              activePath === link.href ||
              (link.href !== "/dashboard" && activePath.startsWith(`${link.href}/`));
            const Icon = link.icon;

            return (
              <m.div
                key={link.href}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="relative"
              >
                {isActive && (
                  <m.span
                    layoutId="sidebar-active-bar"
                    className={cn("absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full", a.bar)}
                    aria-hidden="true"
                  />
                )}
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2",
                    a.ring,
                    isActive
                      ? cn(a.activeBg, a.activeText, "font-semibold")
                      : "text-brand-ink hover:bg-surface-borderSoft"
                  )}
                >
                  {Icon && <Icon size={20} aria-hidden="true" />}
                  <span className="flex-1 truncate">{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
                        isActive ? "bg-white/60 text-current" : "bg-brand-blueLight text-brand-blue"
                      )}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              </m.div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
DashboardSidebar.displayName = "DashboardSidebar";
