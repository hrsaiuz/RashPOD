"use client";

import * as React from "react";
import Link from "next/link";
import { motion as m } from "framer-motion";
import { cn } from "../lib/utils";
import { ChevronDown, LucideIcon } from "lucide-react";

export interface DashboardLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  group?: string;
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
  logoUrl?: string | null;
  brandName?: string;
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
    activeBg: "bg-brand-blue",
    activeText: "text-white",
    bar: "bg-brand-blue",
    ring: "focus:ring-brand-blue/30",
  },
  peach: {
    dot: "bg-brand-peach",
    activeBg: "bg-brand-peach",
    activeText: "text-white",
    bar: "bg-brand-peach",
    ring: "focus:ring-brand-peach/30",
  },
  green: {
    dot: "bg-semantic-success",
    activeBg: "bg-semantic-success",
    activeText: "text-white",
    bar: "bg-semantic-success",
    ring: "focus:ring-semantic-success/30",
  },
  ink: {
    dot: "bg-brand-ink",
    activeBg: "bg-brand-ink",
    activeText: "text-white",
    bar: "bg-brand-ink",
    ring: "focus:ring-brand-ink/30",
  },
};

function isLinkActive(link: DashboardLink, activePath: string) {
  return activePath === link.href || (link.href !== "/dashboard" && activePath.startsWith(`${link.href}/`));
}

function getGroupId(group: string) {
  return `dashboard-nav-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  role,
  links,
  activePath,
  className,
  accent,
  onNavigate,
  logoUrl,
  brandName = "RashPOD",
}) => {
  const resolvedAccent: NonNullable<DashboardSidebarProps["accent"]> =
    accent ?? ACCENT_BY_ROLE[role.toLowerCase()] ?? "blue";
  const a = ACCENT_CLASSES[resolvedAccent];
  const hasGroups = links.some((link) => link.group);
  const { topLevelLinks, groupedLinks } = React.useMemo(() => {
    const topLevel: DashboardLink[] = [];
    const groups: Array<{ label: string; links: DashboardLink[] }> = [];

    links.forEach((link) => {
      if (!link.group) {
        topLevel.push(link);
        return;
      }

      let group = groups.find((item) => item.label === link.group);
      if (!group) {
        group = { label: link.group, links: [] };
        groups.push(group);
      }
      group.links.push(link);
    });

    return { topLevelLinks: topLevel, groupedLinks: groups };
  }, [links]);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groupedLinks.forEach((group) => {
      initial[group.label] = group.links.some((link) => isLinkActive(link, activePath));
    });
    return initial;
  });

  React.useEffect(() => {
    setOpenGroups((current) => {
      let changed = false;
      const next = { ...current };

      groupedLinks.forEach((group) => {
        if (group.links.some((link) => isLinkActive(link, activePath)) && !next[group.label]) {
          next[group.label] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [activePath, groupedLinks]);

  const renderLink = (link: DashboardLink, compact = false) => {
    const isActive = isLinkActive(link, activePath);
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
            "flex min-h-11 items-center gap-3 rounded-[16px] text-sm font-medium transition-colors focus:outline-none focus:ring-2",
            a.ring,
            compact ? "px-3 py-2.5 pl-4" : "px-4 py-3",
            isActive
              ? cn(a.activeBg, a.activeText, "font-semibold shadow-soft")
              : "text-brand-text hover:bg-surface-borderSoft"
          )}
        >
          {Icon && <Icon size={compact ? 18 : 20} aria-hidden="true" className="shrink-0" />}
          <span className="flex-1 truncate">{link.label}</span>
          {link.badge !== undefined && (
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
                isActive ? "bg-white/25 text-white" : "bg-brand-blueLight text-brand-blue"
              )}
            >
              {link.badge}
            </span>
          )}
        </Link>
      </m.div>
    );
  };

  return (
    <aside
      className={cn(
        "w-[260px] bg-white/92 backdrop-blur-md border-r border-surface-borderSoft h-full md:h-screen md:sticky md:top-0 overflow-y-auto shadow-soft",
        className
      )}
      aria-label={`${role} navigation`}
    >
      <div className="p-6">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-brand-blue tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="max-h-10 w-auto max-w-[172px] object-contain" />
            ) : (
              <>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-base text-white shadow-blueGlow">
                  R
                </span>
                <span>{brandName}</span>
              </>
            )}
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", a.dot)} aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-brand-muted">
            {role}
          </span>
        </div>

        <nav className="space-y-1.5" aria-label="Primary">
          {!hasGroups && links.map((link) => renderLink(link))}

          {hasGroups && (
            <>
              {topLevelLinks.map((link) => renderLink(link))}
              <div className="my-3 h-px bg-surface-borderSoft" aria-hidden="true" />
              <div className="space-y-2">
                {groupedLinks.map((group) => {
                  const isOpen = openGroups[group.label] ?? false;
                  const isGroupActive = group.links.some((link) => isLinkActive(link, activePath));
                  const groupId = getGroupId(group.label);

                  return (
                    <div
                      key={group.label}
                      className={cn(
                        "rounded-[18px] border transition-colors",
                        isGroupActive ? "border-brand-blue/20 bg-brand-blueLight/40" : "border-transparent bg-white/55"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !isOpen }))}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2 rounded-[18px] px-3 py-2.5 text-left text-sm font-semibold transition-colors focus:outline-none focus:ring-2",
                          a.ring,
                          isGroupActive ? "text-brand-ink" : "text-brand-muted hover:bg-surface-borderSoft hover:text-brand-ink"
                        )}
                        aria-expanded={isOpen}
                        aria-controls={groupId}
                      >
                        <span className={cn("h-2 w-2 rounded-full", isGroupActive ? a.dot : "bg-surface-border")} aria-hidden="true" />
                        <span className="flex-1 truncate">{group.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-muted shadow-sm">
                          {group.links.length}
                        </span>
                        <ChevronDown
                          size={17}
                          aria-hidden="true"
                          className={cn("shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                        />
                      </button>

                      {isOpen && (
                        <div id={groupId} className="space-y-1 px-2 pb-2">
                          {group.links.map((link) => renderLink(link, true))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
};
DashboardSidebar.displayName = "DashboardSidebar";
