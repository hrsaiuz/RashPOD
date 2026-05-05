"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "designer" || roleParam === "corporate") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(Array.isArray(body?.message) ? body.message.join(", ") : body?.message || `Registration failed (${res.status})`);
      }
      router.push("/auth/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 440, margin: "48px auto", padding: 24, background: "white", borderRadius: 20, border: "1px solid #E5E7EB" }}>
      <h1 style={{ marginTop: 0, color: "#1A1D2E" }}>Create an account</h1>
      <p style={{ color: "#6B7280", marginTop: 0, fontSize: 14 }}>
        Join RashPOD to {role === "designer" ? "sell your designs" : role === "corporate" ? "request bulk orders" : "shop products"}.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        <div>
          <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label htmlFor="displayName" style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            required
            minLength={2}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }}
          />
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>At least 8 characters</p>
        </div>
        <div>
          <label htmlFor="role" style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Account type
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, background: "white", boxSizing: "border-box" }}
          >
            <option value="customer">Customer (shop & order products)</option>
            <option value="designer">Designer (sell your designs)</option>
            <option value="corporate">Corporate (bulk orders)</option>
          </select>
        </div>
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
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      {error && <p style={{ color: "#B42318", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16, marginBottom: 0 }}>
        Already have an account?{" "}
        <a href="/auth/login" style={{ color: "#788AE0", fontWeight: 500, textDecoration: "none" }}>
          Sign in
        </a>
      </p>
    </main>
  );
}
