"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const CARD = { maxWidth: 420, margin: "64px auto", background: "white", borderRadius: 20, padding: 32, boxShadow: "0 2px 12px rgba(120,138,224,0.10)", border: "1px solid #E8EAFB" } as const;
const INPUT = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" as const };
const LABEL = { fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" } as const;

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"DESIGNER" | "CUSTOMER">("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
        throw new Error(msg || `Registration failed (${res.status})`);
      }
      router.push("/auth/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "0 16px" }}>
      <div style={CARD}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1A1D2E" }}>Create your account</h1>
        <p style={{ margin: "0 0 24px", color: "#6B7280", fontSize: 14 }}>Join RashPOD as a designer or customer.</p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }} noValidate>
          <div>
            <label htmlFor="displayName" style={LABEL}>Display name</label>
            <input id="displayName" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={INPUT} required />
          </div>
          <div>
            <label htmlFor="email" style={LABEL}>Email address</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} required />
          </div>
          <div>
            <label htmlFor="password" style={LABEL}>Password <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(min 8 characters)</span></label>
            <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} required minLength={8} />
          </div>
          <div>
            <label style={LABEL}>I want to</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["CUSTOMER", "DESIGNER"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)} style={{ padding: "10px 8px", borderRadius: 12, border: `2px solid ${role === r ? "#788AE0" : "#E5E7EB"}`, background: role === r ? "#EEF0FB" : "white", color: role === r ? "#788AE0" : "#374151", fontWeight: role === r ? 600 : 400, fontSize: 13, cursor: "pointer" }}>
                  {r === "CUSTOMER" ? "🛒 Buy products" : "🎨 Sell designs"}
                </button>
              ))}
            </div>
          </div>
          {error && <p role="alert" style={{ margin: 0, color: "#B42318", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: "13px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#788AE0", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
