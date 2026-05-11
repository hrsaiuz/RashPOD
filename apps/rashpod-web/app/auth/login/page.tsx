"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth-provider";
import { Card, Button } from "@rashpod/ui";

type Mode = "password" | "otp";

function LoginInner() {
  const params = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("password");

  // password mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // otp mode
  const [otpEmail, setOtpEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpTtl, setOtpTtl] = useState<number | null>(null);
  const [otpInfo, setOtpInfo] = useState("");

  const targetFor = (role: string) => {
    const next = params.get("next");
    return (
      next ||
      (role === "CORPORATE_CLIENT"
        ? "/business"
        : role === "CUSTOMER"
          ? "/account"
          : (process.env.NEXT_PUBLIC_DASHBOARD_URL || "") + "/dashboard")
    );
  };

  const onPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { role } = await login(email, password);
      window.location.href = targetFor(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onOtpRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOtpInfo("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to send code");
      setOtpTtl(typeof body?.ttlMinutes === "number" ? body.ttlMinutes : 10);
      setOtpStep("code");
      setOtpInfo(`We sent a 6-digit code to ${otpEmail}. It expires in ${body?.ttlMinutes ?? 10} minutes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const onOtpVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Verification failed");
      window.location.href = targetFor(body?.role || "CUSTOMER");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError("");
      }}
      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        mode === m ? "bg-brand-blue text-white shadow-sm" : "text-brand-muted hover:text-brand-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card>
        <div className="p-2">
          <h1 className="text-2xl font-bold text-brand-ink mb-1">Welcome back</h1>
          <p className="text-sm text-brand-muted mb-6">Sign in to your account.</p>

          <div className="mb-6 flex gap-1 rounded-2xl bg-brand-bg p-1">
            {tabBtn("password", "Password")}
            {tabBtn("otp", "Email code")}
          </div>

          {mode === "password" && (
            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-ink">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-ink">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>
          )}

          {mode === "otp" && otpStep === "email" && (
            <form onSubmit={onOtpRequest} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-ink">Email</label>
                <input
                  type="email"
                  required
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none"
                />
                <p className="mt-2 text-xs text-brand-muted">
                  We&apos;ll email you a 6-digit code. No password needed.
                </p>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">
                Send code
              </Button>
            </form>
          )}

          {mode === "otp" && otpStep === "code" && (
            <form onSubmit={onOtpVerify} className="space-y-4">
              {otpInfo && (
                <div className="rounded-xl bg-brand-bg border border-brand-line px-3 py-2 text-sm text-brand-ink">
                  {otpInfo}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-brand-ink">Enter 6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 text-center font-mono text-2xl tracking-[0.4em] focus:border-brand-blue focus:outline-none"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">
                Verify &amp; sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("email");
                  setOtpCode("");
                  setOtpInfo("");
                  setOtpTtl(null);
                }}
                className="block w-full text-center text-sm text-brand-muted hover:text-brand-ink"
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-brand-muted">
            New to RashPOD? <Link href="/auth/register" className="text-brand-blue hover:underline">Create an account</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </AuthProvider>
  );
}
