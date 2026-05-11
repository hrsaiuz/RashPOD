"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth-provider";
import { Card, Button } from "@rashpod/ui";

function LoginInner() {
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { role } = await login(email, password);
      const next = params.get("next");
      const target =
        next ||
        (role === "CORPORATE_CLIENT" ? "/business" :
          role === "CUSTOMER" ? "/account" :
          (process.env.NEXT_PUBLIC_DASHBOARD_URL || "") + "/dashboard");
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card>
        <div className="p-2">
          <h1 className="text-2xl font-bold text-brand-ink mb-1">Welcome back</h1>
          <p className="text-sm text-brand-muted mb-6">Sign in to your account.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-brand-ink">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">Sign in</Button>
          </form>
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
