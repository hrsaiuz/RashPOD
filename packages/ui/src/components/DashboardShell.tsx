"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { DashboardSidebar, DashboardLink } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";

export interface DashboardShellProps {
  role: string;
  links: DashboardLink[];
  activePath: string;
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  onSignOut: () => void;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  className?: string;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  role,
  links,
  activePath,
  user,
  onSignOut,
  breadcrumbs,
  children,
  className,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar role={role} links={links} activePath={activePath} />
      </div>

      {/* Mobile Sidebar - would use Drawer */}
      {/* Implementation simplified for now */}

      <div className="flex-1 flex flex-col">
        <DashboardTopbar
          user={user}
          onSignOut={onSignOut}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className={cn("flex-1 p-8", className)}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-6">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
DashboardShell.displayName = "DashboardShell";
