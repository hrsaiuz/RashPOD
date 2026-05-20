"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import { Button, Card, ErrorState, Input } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";

export default function AdminAiAssistPage() {
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const [prompt, setPrompt] = useState("Blue oversized hoodie with abstract ink print");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/ai/listing-copy`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ titleHint: prompt }),
      });
      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`AI request failed (${res.status})`);
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">AI Assist</h1>
          <p className="text-brand-muted mt-1">
            Draft generator for listings. Human approval is always required.
            {user ? ` Signed in as ${user.email} (${user.role}).` : ""}
          </p>
        </div>
        <Card>
          <form onSubmit={run} className="flex flex-col md:flex-row gap-3">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <Button variant="primaryBlue" loading={loading}>Generate</Button>
          </form>
        </Card>
        {error ? <ErrorState title="AI request failed" description={error} /> : null}
        {result ? <Card><pre className="m-0 overflow-x-auto rounded-xl bg-surface-subtle p-4 text-xs text-brand-ink">{JSON.stringify(result, null, 2)}</pre></Card> : null}
      </div>
    </DashboardLayout>
  );
}
