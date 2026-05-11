"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { SessionUser } from "../../lib/api";

type AuthState = {
  user: SessionUser | null;
  isLoading: boolean;
  clearSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ role: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ role: string }>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setUser(d.user as SessionUser); })
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    return { role: data.role || "CUSTOMER" };
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || "Registration failed");
    }
    const data = await res.json();
    setUser(data.user);
    return { role: data.user?.role || "CUSTOMER" };
  };

  const clearSession = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  const value = useMemo<AuthState>(() => ({ user, isLoading, clearSession, login, register }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
