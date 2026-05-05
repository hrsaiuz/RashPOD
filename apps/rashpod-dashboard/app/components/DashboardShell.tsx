"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LayoutDashboard, Users, FileImage, Type, Settings, Package, ShoppingBag, Bell, Menu } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingBag className="w-5 h-5" /> },
  { href: "/admin/catalog", label: "Catalog", icon: <Package className="w-5 h-5" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="w-5 h-5" /> },
  { href: "/admin/media", label: "Media Library", icon: <FileImage className="w-5 h-5" /> },
  { href: "/admin/fonts", label: "Font Library", icon: <Type className="w-5 h-5" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* Sidebar */}
      <aside className="w-[260px] bg-surface-darkShell text-[#C8CDD6] flex flex-col m-4 rounded-[14px] overflow-hidden shadow-sm shrink-0 hidden md:flex">
        <div className="h-[76px] flex items-center px-6 border-b border-white/5">
          <Link href="/admin" className="text-white font-bold text-xl tracking-tight">RashPOD Admin</Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {ADMIN_LINKS.map(link => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                  isActive ? "bg-[#2A2A2A] text-white" : "hover:bg-white/5 hover:text-white"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[76px] bg-white border-b border-surface-border-soft flex items-center justify-between px-8 shrink-0">
          <button className="md:hidden text-brand-ink"><Menu className="w-6 h-6" /></button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full border border-surface-border flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-brand-bg border border-surface-border flex items-center justify-center font-bold text-brand-ink">
              AD
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
