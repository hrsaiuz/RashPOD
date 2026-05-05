"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../auth-provider";

const ROLE_PRIORITY = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE_STAFF",
  "MODERATOR",
  "PRODUCTION_STAFF",
  "SUPPORT_STAFF",
  "CORPORATE_CLIENT",
  "DESIGNER",
  "CUSTOMER",
];

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  ADMIN: "/dashboard/admin",
  OPERATIONS_MANAGER: "/dashboard/admin",
  MODERATOR: "/dashboard/moderator",
  PRODUCTION_STAFF: "/dashboard/production",
  FINANCE_STAFF: "/dashboard/finance",
  SUPPORT_STAFF: "/dashboard/support",
  DESIGNER: "/dashboard/designer",
  CUSTOMER: "/dashboard/customer",
  CORPORATE_CLIENT: "/dashboard/corporate",
};

function normalizeRole(roleValue: string | string[]): string {
  if (Array.isArray(roleValue)) {
    for (const priority of ROLE_PRIORITY) {
      if (roleValue.includes(priority)) return priority;
    }
    return roleValue[0] || "CUSTOMER";
  }
  return roleValue;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccessMessage("Account created! Please sign in.");
    }
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const { role: rawRole } = await login(email, password);
      const role = normalizeRole(rawRole);
      const defaultDest = ROLE_ROUTES[role] || "/dashboard/customer";

      const nextParam = searchParams.get("next");
      if (nextParam && nextParam.startsWith("/dashboard")) {
        const expectedPrefix = ROLE_ROUTES[role];
        if (expectedPrefix && nextParam.startsWith(expectedPrefix)) {
          router.push(nextParam);
          return;
        }
      }

      router.push(defaultDest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 440, margin: "48px auto", padding: 24, background: "white", borderRadius: 20, border: "1px solid #E5E7EB" }}>
      <h1 style={{ marginTop: 0, color: "#1A1D2E" }}>Dashboard Login</h1>
      <p style={{ color: "#6B7280", marginTop: 0, fontSize: 14 }}>Sign in to access your dashboard.</p>
      {successMessage && (
        <div style={{ background: "#F0F9FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#1E40AF", fontSize: 14 }}>
          {successMessage}
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 12, border: "1px solid #D1D5DB" }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
          style={{ padding: 12, borderRadius: 12, border: "1px solid #D1D5DB" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 999,
            border: "none",
            background: "#788AE0",
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error && <p style={{ color: "#B42318", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16, marginBottom: 0 }}>
        Don't have an account?{" "}
        <a href="/auth/register" style={{ color: "#788AE0", fontWeight: 500, textDecoration: "none" }}>
          Create one
        </a>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 440, margin: "48px auto", padding: 24, textAlign: "center" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
