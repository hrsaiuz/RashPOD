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
  setSession: (token: string, user?: SessionUser | null) => void;
  clearSession: () => void;
};

const TOKEN_KEY = "rashpod_dashboard_token";
const USER_KEY = "rashpod_dashboard_user";
const TOKEN_COOKIE = "rashpod_dashboard_token";

function writeTokenCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_KEY) || "";
    const savedUserRaw = window.localStorage.getItem(USER_KEY);
    const savedUser = savedUserRaw ? (JSON.parse(savedUserRaw) as SessionUser) : null;
    setToken(savedToken);
    setUser(savedUser);
    if (savedToken) writeTokenCookie(savedToken);
    setIsReady(true);
  }, []);

  const setSession = (nextToken: string, nextUser?: SessionUser | null) => {
    setToken(nextToken);
    if (nextUser !== undefined) setUser(nextUser);
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    writeTokenCookie(nextToken);
    if (nextUser !== undefined) {
      if (nextUser) window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      else window.localStorage.removeItem(USER_KEY);
    }
  };

  const clearSession = () => {
    setToken("");
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    clearTokenCookie();
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
