"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@rashpod/ui";
import { api, type CorporateRequest } from "../../../../lib/api";

export default function NewRequest() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [budget, setBudget] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await api.post<CorporateRequest>("/corporate/requests", {
        title, details, quantity: Number(quantity),
        budget: budget === "" ? undefined : Number(budget),
        deadline: deadline || undefined,
      });
      router.push(`/business/requests/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/business/requests" className="text-sm text-brand-muted hover:text-brand-blue">← Back</Link>
      <h1 className="text-3xl font-bold text-brand-ink">New brief</h1>
      <Card>
        <form onSubmit={submit} className="p-1 space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-ink">Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Details</label>
            <textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-brand-ink">Quantity</label>
              <input type="number" min={1} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Budget (UZS)</label>
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Button type="submit" variant="primaryBlue" loading={loading}>Submit brief</Button>
        </form>
      </Card>
    </div>
  );
}
