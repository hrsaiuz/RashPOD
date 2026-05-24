"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

type SessionUser = {
  id: string;
  email: string;
  role: string;
  displayName?: string;
};

type AuthState = {
  user: SessionUser | null;
  isLoading: boolean;
  clearSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ role: string }>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user as SessionUser);
      })
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ role: string }> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body?.error === "string"
          ? body.error
          : Array.isArray(body?.error)
            ? body.error.join(", ")
            : "Login failed";
      throw new Error(message);
    }
    const data = await res.json();
    flushSync(() => {
      setUser(data.user ?? null);
    });
    return { role: data.role || data.user?.role || "CUSTOMER" };
  }, []);

  const clearSession = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isLoading, clearSession, login }),
    [user, isLoading, clearSession, login],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Legacy compatibility
export { useAuth as default };
