"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth/auth-provider";
import { Card } from "@rashpod/ui";
import { Briefcase, FileText, Inbox, Package, Settings, LogOut } from "lucide-react";

const LINKS = [
  { href: "/business", label: "Overview", icon: Briefcase },
  { href: "/business/requests", label: "Requests", icon: FileText },
  { href: "/business/offers", label: "Offers", icon: Inbox },
  { href: "/business/orders", label: "Orders", icon: Package },
  { href: "/business/settings", label: "Settings", icon: Settings },
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
              <div className="text-xs uppercase tracking-wide text-brand-muted mb-0.5">Business</div>
              <div className="font-semibold text-brand-ink truncate">{user.displayName || user.email}</div>
            </div>
          </Card>
          <nav className="space-y-1">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.href || (l.href !== "/business" && pathname.startsWith(l.href));
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

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedShell>{children}</ProtectedShell>
    </AuthProvider>
  );
}
