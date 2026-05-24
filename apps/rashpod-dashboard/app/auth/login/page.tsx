"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, MarketingInput } from "@rashpod/ui";
import { useAuth } from "../auth-provider";
import { getLoginRedirectPath } from "../../../lib/dashboard-routes";
import { AuthFormColumn, AuthPageFallback } from "../auth-login-shell";
import { useAuthBranding } from "../auth-decorations";

function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { branding } = useAuthBranding();
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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      const { role } = await login(normalizedEmail, password);
      const destination = getLoginRedirectPath(role, searchParams.get("next"));
      window.location.assign(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown login error");
      setLoading(false);
    }
  };

  return (
    <AuthFormColumn>
      {branding?.loginLogoUrl ? (
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.loginLogoUrl}
            alt={
              typeof branding.theme?.storeName === "string"
                ? branding.theme.storeName
                : "RashPOD"
            }
            className="max-h-16 max-w-[220px] object-contain object-left"
          />
        </div>
      ) : (
        <p className="mb-8 text-[2rem] font-bold lowercase tracking-tight text-brand-blue">rashpod</p>
      )}
      <h1 className="text-[2rem] font-bold leading-tight text-brand-ink">Dashboard Login</h1>
      <p className="mt-2 text-base text-brand-ink">Sign in to access your dashboard.</p>
      {successMessage ? (
        <div className="mt-4 rounded-xl border border-semantic-infoBg bg-semantic-infoBg p-3 text-sm text-semantic-infoText">
          {successMessage}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 grid gap-6">
        <MarketingInput
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <MarketingInput
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="primaryPeach"
          size="lg"
          className="w-full lowercase"
          loading={loading}
          disabled={loading}
        >
          sign in
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-brand-peachSecondary">
            {error}
          </p>
        ) : null}
      </form>
      <p className="mt-8 text-sm text-brand-ink">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-medium underline underline-offset-2 hover:text-brand-blue">
          Create one
        </Link>
      </p>
    </AuthFormColumn>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
