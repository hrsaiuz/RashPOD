"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth-provider";
import { Card, Button, FormField, Input, PageContainer } from "@rashpod/ui";

function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xs border border-semantic-dangerBg bg-semantic-dangerBg px-3 py-2 text-sm text-semantic-dangerText">
      {message}
    </div>
  );
}

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

  useEffect(() => {
    const code = params.get("error");
    if (code === "google_not_configured") setError("Google sign-in is not configured yet.");
    if (code === "google_signin_failed") setError("Google sign-in could not be completed. Please try again.");
    if (code === "google_account_unavailable") setError("This Google account cannot sign in to RashPOD.");
  }, [params]);

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
        mode === m ? "bg-brand-blue text-white shadow-soft" : "text-brand-muted hover:text-brand-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <PageContainer variant="form" className="py-8 sm:py-16">
      <Card>
        <div className="p-2 sm:p-4">
          <h1 className="text-2xl font-bold text-brand-ink mb-1">Welcome back</h1>
          <p className="text-sm text-brand-muted mb-6">Sign in to your account.</p>

          <div className="mb-6 flex gap-1 rounded-2xl bg-brand-bg p-1">
            {tabBtn("password", "Password")}
            {tabBtn("otp", "Email code")}
          </div>

          <a
            href={`/api/auth/google/start?next=${encodeURIComponent(params.get("next") || "/account")}`}
            className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-pill border border-brand-line bg-white px-5 text-sm font-semibold text-brand-ink shadow-xs transition-colors hover:bg-brand-bg focus:outline-none focus:ring-4 focus:ring-brand-blue/20"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z" />
              <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
            </svg>
            Continue with Google
          </a>

          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-brand-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-brand-line" />
            or
            <span className="h-px flex-1 bg-brand-line" />
          </div>

          {mode === "password" && (
            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <FormField label="Email">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </FormField>
              <FormField label="Password">
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </FormField>
              {error ? <AuthError message={error} /> : null}
              <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>
          )}

          {mode === "otp" && otpStep === "email" && (
            <form onSubmit={onOtpRequest} className="space-y-4">
              <FormField label="Email" helperText="We'll email you a 6-digit code. No password needed.">
                <Input type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} autoComplete="email" />
              </FormField>
              {error ? <AuthError message={error} /> : null}
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
              <FormField label="Enter 6-digit code">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center font-mono text-2xl tracking-[0.4em]"
                />
              </FormField>
              {error ? <AuthError message={error} /> : null}
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
    </PageContainer>
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
