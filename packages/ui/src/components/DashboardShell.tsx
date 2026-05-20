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

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 18% 8%, rgba(207, 214, 250, 0.55), transparent 28%), radial-gradient(circle at 88% 18%, rgba(255, 214, 198, 0.5), transparent 24%)",
        }}
      />
      {/* Desktop Sidebar */}
      <div className="relative hidden md:block">
        <DashboardSidebar
          role={role}
          links={links}
          activePath={activePath}
          accent={sidebarAccent}
          logoUrl={sidebarLogoUrl}
          brandName={brandName}
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
          className={cn("flex-1 w-full max-w-dashboard mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8", className)}
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
