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
  sidebarLogoUrl?: string | null;
  brandName?: string;
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
  sidebarLogoUrl,
  brandName,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [sidebarCompact, setSidebarCompact] = React.useState(true);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rashpod.dashboard.sidebar-compact");
    if (stored !== null) setSidebarCompact(stored !== "false");
  }, []);

  function updateSidebarCompact(value: boolean) {
    setSidebarCompact(value);
    window.localStorage.setItem("rashpod.dashboard.sidebar-compact", String(value));
  }

  return (
    <div className="backoffice-shell flex min-h-screen bg-backoffice-canvas text-backoffice-text">
      {/* Desktop Sidebar */}
      <div className="relative hidden md:block">
        <DashboardSidebar
          role={role}
          links={links}
          activePath={activePath}
          accent={sidebarAccent}
          logoUrl={sidebarLogoUrl}
          brandName={brandName}
          compact={sidebarCompact}
          onCompactChange={updateSidebarCompact}
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
          logoUrl={sidebarLogoUrl}
          brandName={brandName}
          onNavigate={() => setMobileSidebarOpen(false)}
          className="!w-full !border-r-0"
          compact={false}
        />
      </Drawer>

      <div className="relative flex-1 flex flex-col min-w-0">
        <DashboardTopbar
          user={user}
          onSignOut={onSignOut}
          onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)}
        />

        <main
          id="main-content"
          className={cn("flex-1 w-full max-w-dashboard mx-auto px-4 py-5 sm:px-6 md:px-8 md:py-6", className)}
          tabIndex={-1}
        >
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-4">
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
