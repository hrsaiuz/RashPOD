"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, MarketingInput, MarketingSelect } from "@rashpod/ui";
import { AuthFormColumn, AuthPageFallback } from "../auth-login-shell";
import { useAuthBranding } from "../auth-decorations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branding } = useAuthBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "designer" || roleParam === "corporate") setRole(roleParam);
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

  const roleHint =
    role === "designer" ? "sell your designs" : role === "corporate" ? "request bulk orders" : "shop products";

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
      <h1 className="text-[2rem] font-bold leading-tight text-brand-ink">Create an account</h1>
      <p className="mt-2 text-base text-brand-ink">Join RashPOD to {roleHint}.</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-6">
        <MarketingInput
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <MarketingInput
          label="Display name"
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
        />
        <MarketingInput
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <MarketingSelect label="Account type" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="customer">Customer (shop & order products)</option>
          <option value="designer">Designer (sell your designs)</option>
          <option value="corporate">Corporate (bulk orders)</option>
        </MarketingSelect>
        <Button
          type="submit"
          variant="primaryPeach"
          size="lg"
          loading={loading}
          disabled={loading}
          className="w-full lowercase"
        >
          create account
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-brand-peachSecondary">
            {error}
          </p>
        ) : null}
      </form>
      <p className="mt-8 text-sm text-brand-ink">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium underline underline-offset-2 hover:text-brand-blue">
          Sign in
        </Link>
      </p>
    </AuthFormColumn>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
