"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorState, FormField, Input, Select, Textarea } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

const categories = [
  { value: "rejected_design", label: "Rejected design" },
  { value: "payout", label: "Payout" },
  { value: "listing", label: "Listing" },
  { value: "account", label: "Account" },
  { value: "upload_problem", label: "Upload problem" },
  { value: "other", label: "Other" },
];

export default function DesignerSupportPage() {
  const params = useSearchParams(); const router = useRouter(); const { user, isLoading: authLoading } = useAuth(); const [category, setCategory] = useState(params.get("category") || "other"); const [designId, setDesignId] = useState(params.get("designId") || ""); const [listingId, setListingId] = useState(params.get("listingId") || ""); const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  useEffect(() => { if (!authLoading && !user) router.push("/auth/login?next=/dashboard/designer/support"); }, [user, authLoading, router]);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); setSuccess(""); try { const res = await fetch("/api/proxy/designer/support-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, subject, message, designId: designId || undefined, listingId: listingId || undefined }) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || `Server error (${res.status})`); setSuccess("Support request sent. RashPOD support will review it."); setMessage(""); setSubject(""); } catch (err) { setError(err instanceof Error ? err.message : "Failed to send support request."); } finally { setSaving(false); } }
  return <DashboardLayout role="designer"><div className="mb-6"><h1 className="text-2xl font-bold text-brand-ink">Designer Support</h1><p className="text-sm text-brand-muted">Ask for help with moderation, payouts, listings, account, or uploads.</p></div>{error ? <ErrorState title="Support request issue" description={error} /> : null}{success ? <div className="mb-4 rounded-xl border border-semantic-success/25 bg-semantic-successBg px-4 py-3 text-sm font-semibold text-semantic-successText">{success}</div> : null}<form onSubmit={submit} className="max-w-2xl rounded-2xl border border-brand-line bg-white p-5 shadow-soft"><div className="space-y-4"><FormField label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField><FormField label="Design id"><Input value={designId} onChange={(event) => setDesignId(event.target.value)} placeholder="Optional" /></FormField><FormField label="Listing id"><Input value={listingId} onChange={(event) => setListingId(event.target.value)} placeholder="Optional" /></FormField><FormField label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></FormField><FormField label="Message"><Textarea required value={message} onChange={(event) => setMessage(event.target.value)} /></FormField><Button type="submit" loading={saving}>Send request</Button></div></form></DashboardLayout>;
}
