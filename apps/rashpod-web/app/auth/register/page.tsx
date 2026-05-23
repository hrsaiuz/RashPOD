"use client";

import { FormEvent, Suspense, useState } from "react";
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
    <PageContainer variant="form" className="py-8 sm:py-16">
      <Card>
        <div className="p-2 sm:p-4">
          <h1 className="text-h3 font-bold text-brand-ink mb-1">Create an account</h1>
          <p className="text-sm text-brand-muted mb-6">Shop custom designs from Uzbek creators.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Full name">
              <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
            </FormField>
            <FormField label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </FormField>
            <FormField label="Password" helperText="At least 8 characters">
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </FormField>
            {error ? <AuthError message={error} /> : null}
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
    </PageContainer>
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
