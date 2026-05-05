"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("admin@rashpod.local");
  const [password, setPassword] = useState("ChangeMe123!");
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
      setSession(accessToken, me);
      router.push("/dashboard/admin/worker-jobs");
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
