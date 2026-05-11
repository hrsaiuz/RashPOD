"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { DashboardSidebar, DashboardLink } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import { Drawer } from "./Drawer";

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
  /** Override the sidebar accent colour (otherwise derived from role). */
  sidebarAccent?: "blue" | "peach" | "green" | "ink";
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
  sidebarAccent,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar
          role={role}
          links={links}
          activePath={activePath}
          accent={sidebarAccent}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        side="left"
        className="!w-[280px] !p-0"
      >
        <DashboardSidebar
          role={role}
          links={links}
          activePath={activePath}
          accent={sidebarAccent}
          onNavigate={() => setMobileSidebarOpen(false)}
          className="!w-full !border-r-0"
        />
      </Drawer>

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar
          user={user}
          onSignOut={onSignOut}
          onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)}
        />

        <main
          id="main-content"
          className={cn("flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8", className)}
          tabIndex={-1}
        >
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
