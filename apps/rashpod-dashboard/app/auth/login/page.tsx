"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, FormField, Input, PageContainer } from "@rashpod/ui";
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

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

interface PublicBranding {
  loginLogoUrl: string | null;
  theme?: { storeName?: string };
}

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  ADMIN: "/dashboard/admin",
  OPERATIONS_MANAGER: "/dashboard/admin",
  MODERATOR: "/dashboard/moderator",
  PRODUCTION_STAFF: "/dashboard/production",
  FINANCE_STAFF: "/dashboard/finance",
  SUPPORT_STAFF: "/dashboard/support",
  DESIGNER: "/dashboard/designer",
  CUSTOMER: `${WEB_URL}/account`,
  CORPORATE_CLIENT: `${WEB_URL}/business`,
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
  const [branding, setBranding] = useState<PublicBranding | null>(null);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccessMessage("Account created! Please sign in.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!API_URL) return;
    const controller = new AbortController();
    fetch(`${API_URL}/branding`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBranding(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const { role: rawRole } = await login(email, password);
      const role = normalizeRole(rawRole);
      const defaultDest = ROLE_ROUTES[role] || "/dashboard/designer";

      if (defaultDest.startsWith("http")) {
        window.location.href = defaultDest;
        return;
      }

      const nextParam = searchParams.get("next");
      if (nextParam && nextParam.startsWith("/dashboard")) {
        const expectedPrefix = ROLE_ROUTES[role];
        if (expectedPrefix && !expectedPrefix.startsWith("http") && nextParam.startsWith(expectedPrefix)) {
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
    <PageContainer variant="form" compact className="py-12">
      <Card className="mx-auto max-w-md p-6 sm:p-8">
        {branding?.loginLogoUrl ? (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.loginLogoUrl}
              alt={branding.theme?.storeName || "RashPOD"}
              className="max-h-20 max-w-[260px] object-contain"
            />
          </div>
        ) : null}
        <h1 className="text-h3 font-bold text-brand-ink">Dashboard Login</h1>
        <p className="mt-1 text-sm text-brand-muted">Sign in to access your dashboard.</p>
        {successMessage ? (
          <div className="mt-4 rounded-xl border border-semantic-infoBg bg-semantic-infoBg p-3 text-sm text-semantic-infoText">
            {successMessage}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          </FormField>
          <Button type="submit" variant="primaryBlue" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-semantic-dangerText">{error}</p> : null}
        <p className="mt-4 text-center text-sm text-brand-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium text-brand-blue hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageContainer variant="form" compact className="py-12 text-center text-brand-muted">
          Loading...
        </PageContainer>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
