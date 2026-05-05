"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const CARD = { maxWidth: 420, margin: "64px auto", background: "white", borderRadius: 20, padding: 32, boxShadow: "0 2px 12px rgba(120,138,224,0.10)", border: "1px solid #E8EAFB" } as const;
const INPUT = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" as const, outline: "none" };
const LABEL = { fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" } as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid email or password." : `Login failed (${res.status})`);
      const { accessToken } = (await res.json()) as { accessToken: string };
      await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });
      router.push("/shop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "0 16px" }}>
      <div style={CARD}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1A1D2E" }}>Sign in to RashPOD</h1>
        <p style={{ margin: "0 0 24px", color: "#6B7280", fontSize: 14 }}>Welcome back.</p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }} noValidate>
          <div>
            <label htmlFor="email" style={LABEL}>Email address</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} required />
          </div>
          <div>
            <label htmlFor="password" style={LABEL}>Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} required />
          </div>
          {error && <p role="alert" style={{ margin: 0, color: "#B42318", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: "13px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
          No account?{" "}
          <Link href="/auth/register" style={{ color: "#788AE0", fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </main>
  );
}
