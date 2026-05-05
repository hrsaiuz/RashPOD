"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Search, Bell, Menu, User, LogOut } from "lucide-react";

export interface DashboardTopbarProps {
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  onSignOut: () => void;
  onMobileMenuToggle?: () => void;
  searchSlot?: React.ReactNode;
  className?: string;
}

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({
  user,
  onSignOut,
  onMobileMenuToggle,
  searchSlot,
  className,
}) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "h-[76px] bg-white border-b border-surface-borderSoft flex items-center justify-between px-6 sticky top-0 z-10",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-surface-borderSoft transition-colors"
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        )}
        {searchSlot || (
          <div className="hidden md:block relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="search"
              placeholder="Search..."
              className="w-80 h-10 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg hover:bg-surface-borderSoft transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-brand-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-semantic-danger rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-borderSoft transition-colors"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-blueLight flex items-center justify-center">
                <User size={16} className="text-brand-blue" />
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-brand-ink">{user.name}</span>
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lift border border-surface-borderSoft py-2 z-20">
                <div className="px-4 py-3 border-b border-surface-borderSoft">
                  <p className="text-sm font-medium text-brand-ink">{user.name}</p>
                  {user.email && <p className="text-xs text-brand-muted">{user.email}</p>}
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-semantic-dangerText hover:bg-semantic-dangerBg transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
DashboardTopbar.displayName = "DashboardTopbar";
