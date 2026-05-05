"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const CARD = { maxWidth: 420, margin: "64px auto", background: "white", borderRadius: 20, padding: 32, boxShadow: "0 2px 12px rgba(120,138,224,0.10)", border: "1px solid #E8EAFB" } as const;
const INPUT = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" as const, letterSpacing: 4, textAlign: "center" as const };

function VerifyForm() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) { setError("Please enter the verification code."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) throw new Error("Invalid or expired code. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ margin: "0 0 8px", color: "#1A1D2E" }}>Email verified!</h2>
        <p style={{ color: "#6B7280", marginBottom: 20 }}>Your account is now active.</p>
        <Link href="/auth/login" style={{ background: "#788AE0", color: "white", padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>📬</div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#1A1D2E", textAlign: "center" }}>Check your inbox</h1>
      <p style={{ margin: "0 0 24px", color: "#6B7280", fontSize: 14, textAlign: "center" }}>
        We sent a verification code to <strong>{email || "your email"}</strong>.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }} noValidate>
        <div>
          <label htmlFor="code" style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" }}>
            Verification code
          </label>
          <input id="code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={INPUT} required />
        </div>
        {error && <p role="alert" style={{ margin: 0, color: "#B42318", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "13px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>
        Didn&apos;t get a code?{" "}
        <Link href="/auth/register" style={{ color: "#788AE0" }}>Go back</Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <main style={{ padding: "0 16px" }}>
      <div style={CARD}>
        <Suspense fallback={<p style={{ textAlign: "center", color: "#6B7280" }}>Loading…</p>}>
          <VerifyForm />
        </Suspense>
      </div>
    </main>
  );
}
