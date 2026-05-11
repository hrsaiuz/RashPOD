"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { AuthProvider, useAuth } from "../auth-provider";
import { Card, Button } from "@rashpod/ui";

function RegisterInner() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email, password, displayName);
      window.location.href = "/account";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card>
        <div className="p-2">
          <h1 className="text-2xl font-bold text-brand-ink mb-1">Create an account</h1>
          <p className="text-sm text-brand-muted mb-6">Shop custom designs from Uzbek creators.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-brand-ink">Full name</label>
              <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">Create account</Button>
          </form>
          <div className="mt-6 text-center text-sm text-brand-muted">
            Already have an account? <Link href="/auth/login" className="text-brand-blue hover:underline">Sign in</Link>
          </div>
          <div className="mt-2 text-center text-xs text-brand-muted">
            Want to sell designs? <a href={(process.env.NEXT_PUBLIC_DASHBOARD_URL || "") + "/auth/register?role=designer"} className="text-brand-blue hover:underline">Become a designer</a>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <RegisterInner />
      </Suspense>
    </AuthProvider>
  );
}
