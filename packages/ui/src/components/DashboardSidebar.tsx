"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { LucideIcon } from "lucide-react";

export interface DashboardLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export interface DashboardSidebarProps {
  role: string;
  links: DashboardLink[];
  activePath: string;
  className?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  role,
  links,
  activePath,
  className,
}) => {
  return (
    <aside
      className={cn(
        "w-[260px] bg-white border-r border-surface-borderSoft h-screen sticky top-0 overflow-y-auto",
        className
      )}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-brand-blue">RashPOD</h2>
          <p className="text-xs text-brand-muted mt-1">{role}</p>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = activePath === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-blueLight text-brand-blue"
                    : "text-brand-ink hover:bg-surface-borderSoft"
                )}
              >
                {Icon && <Icon size={20} />}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
DashboardSidebar.displayName = "DashboardSidebar";
