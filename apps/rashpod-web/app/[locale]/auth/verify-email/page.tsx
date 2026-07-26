"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, PageContainer, Skeleton } from "@rashpod/ui";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    fetch("/api/proxy/auth/verify-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message || "The verification link is invalid or expired.");
        setState("success");
      })
      .catch((error) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Email verification failed.");
      });
  }, [token]);

  return (
    <PageContainer variant="form" className="py-12 sm:py-20">
      <Card className="text-center">
        {state === "loading" ? <Skeleton className="h-40" /> : null}
        {state === "success" ? (
          <>
            <h1 className="text-2xl font-bold text-brand-ink">Email verified</h1>
            <p className="mt-3 text-brand-muted">Your email is confirmed. You can now sign in.</p>
            <Link href="/auth/login" className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-brand-blue px-6 text-sm font-semibold text-white">
              Sign in
            </Link>
          </>
        ) : null}
        {state === "error" ? (
          <>
            <h1 className="text-2xl font-bold text-brand-ink">Verification failed</h1>
            <p role="alert" className="mt-3 text-semantic-dangerText">{message}</p>
            <Link href="/auth/login" className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-blue underline underline-offset-2">
              Return to sign in
            </Link>
          </>
        ) : null}
      </Card>
    </PageContainer>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<PageContainer variant="form" className="py-20"><Skeleton className="h-56" /></PageContainer>}><VerifyEmailContent /></Suspense>;
}
