"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, FormField, Input, PageContainer } from "@rashpod/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xs border border-semantic-dangerBg bg-semantic-dangerBg px-3 py-2 text-sm text-semantic-dangerText">
      {message}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    <PageContainer variant="form" className="py-8 sm:py-12">
      <Card className="p-4 sm:p-6">
        <h1 className="text-h3 font-bold text-brand-ink">Create an account</h1>
        <p className="mt-1 text-sm text-brand-muted">Join RashPOD to {roleHint}.</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </FormField>
          <FormField label="Display name" htmlFor="displayName">
            <Input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" required minLength={2} />
          </FormField>
          <FormField label="Password" htmlFor="password" helperText="At least 8 characters">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
          </FormField>
          <FormField label="Account type" htmlFor="role">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-11 w-full rounded-xs border border-brand-line bg-white px-3 text-sm text-brand-text"
            >
              <option value="customer">Customer (shop & order products)</option>
              <option value="designer">Designer (sell your designs)</option>
              <option value="corporate">Corporate (bulk orders)</option>
            </select>
          </FormField>
          {error ? <AuthError message={error} /> : null}
          <Button type="submit" variant="primaryBlue" size="lg" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-brand-blue hover:underline">Sign in</Link>
        </p>
      </Card>
    </PageContainer>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageContainer variant="form" className="py-12 text-center text-brand-muted">Loading...</PageContainer>}>
      <RegisterForm />
    </Suspense>
  );
}
