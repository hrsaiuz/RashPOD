"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";

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
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ marginBottom: 8 }}>AI Assist</h1>
      <p style={{ marginTop: 0, color: "#6B7280" }}>
        Draft generator for listings. Human approval is always required.
        {user ? ` Signed in as ${user.email} (${user.role}).` : ""}
      </p>
      <form onSubmit={run} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #D1D5DB" }}
        />
        <button style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: "#788AE0", color: "white" }}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      {error ? <p style={{ color: "#B42318" }}>{error}</p> : null}
      {result ? (
        <pre style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12, overflowX: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
