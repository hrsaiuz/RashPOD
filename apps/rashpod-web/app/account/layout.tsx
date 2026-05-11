"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth/auth-provider";
import { Button, Card } from "@rashpod/ui";
import { Package, MapPin, Heart, Settings, LogOut, User } from "lucide-react";

const LINKS = [
  { href: "/account", label: "Overview", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

function ProtectedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, clearSession } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return <div className="max-w-6xl mx-auto py-16 px-4 text-center text-brand-muted">Loading…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-4">
          <Card>
            <div className="p-2">
              <div className="font-semibold text-brand-ink truncate">{user.displayName || user.email}</div>
              <div className="text-xs text-brand-muted truncate">{user.email}</div>
            </div>
          </Card>
          <nav className="space-y-1">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.href || (l.href !== "/account" && pathname.startsWith(l.href));
              return (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-brand-blueLight text-brand-blue font-medium" : "text-brand-ink hover:bg-brand-surface"
                  }`}>
                  <Icon size={18} /> {l.label}
                </Link>
              );
            })}
            <button onClick={async () => { await clearSession(); router.push("/"); }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-brand-ink hover:bg-brand-surface">
              <LogOut size={18} /> Sign out
            </button>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedShell>{children}</ProtectedShell>
    </AuthProvider>
  );
}
