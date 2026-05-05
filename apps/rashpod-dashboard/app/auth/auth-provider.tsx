"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type SessionUser = {
  id: string;
  email: string;
  role: string;
  displayName?: string;
};

type AuthState = {
  token: string;
  user: SessionUser | null;
  isReady: boolean;
  setSession: (token: string, user?: SessionUser | null) => Promise<void>;
  clearSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Restore token + user by reading the httpOnly cookie via a server-side API route
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.token) {
          setToken(d.token as string);
          if (d.user) setUser(d.user as SessionUser);
        }
      })
      .catch(() => null)
      .finally(() => setIsReady(true));
  }, []);

  const setSession = async (nextToken: string, nextUser?: SessionUser | null) => {
    await fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: nextToken }),
    });
    setToken(nextToken);
    if (nextUser !== undefined) setUser(nextUser ?? null);
  };

  const clearSession = async () => {
    await fetch("/api/auth/clear-cookie", { method: "POST" });
    setToken("");
    setUser(null);
  };

  const value = useMemo<AuthState>(
    () => ({ token, user, isReady, setSession, clearSession }),
    [token, user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
