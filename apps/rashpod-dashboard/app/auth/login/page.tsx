"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
      const { accessToken } = (await loginRes.json()) as { accessToken: string };

      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = meRes.ok ? await meRes.json() : null;
      await setSession(accessToken, me);

      const nextParam = new URLSearchParams(window.location.search).get("next");
      if (nextParam && nextParam.startsWith("/dashboard")) {
        router.push(nextParam);
        return;
      }
      const roleRoutes: Record<string, string> = {
        SUPER_ADMIN: "/dashboard/super-admin",
        ADMIN: "/dashboard/admin/worker-jobs",
        OPERATIONS_MANAGER: "/dashboard/admin/worker-jobs",
        MODERATOR: "/dashboard/moderator",
        PRODUCTION_STAFF: "/dashboard/production",
        FINANCE_STAFF: "/dashboard/finance",
        SUPPORT_STAFF: "/dashboard/support",
        DESIGNER: "/dashboard/designer",
        CUSTOMER: "/dashboard/customer",
        CORPORATE_CLIENT: "/dashboard/corporate",
      };
      const dest = (me?.role && roleRoutes[me.role as string]) || "/dashboard";
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 440, margin: "48px auto", padding: 24, background: "white", borderRadius: 20, border: "1px solid #E5E7EB" }}>
      <h1 style={{ marginTop: 0 }}>Dashboard Login</h1>
      <p style={{ color: "#6B7280", marginTop: 0 }}>Sign in with an admin/operations account.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 12, borderRadius: 12, border: "1px solid #D1D5DB" }} />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ padding: 12, borderRadius: 12, border: "1px solid #D1D5DB" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "12px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
    </main>
  );
}
