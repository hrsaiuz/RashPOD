"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, Card, Input, Skeleton, StatusBadge } from "@rashpod/ui";
import { CheckCircle2, ShieldCheck } from "lucide-react";

type Detail = { email: string; displayName?: string | null; personalMessage?: string | null; status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"; expiresAt: string; inviter: { displayName: string } };

export default function DesignerInvitationPage() {
  const { token, locale } = useParams<{ token: string; locale: string }>();
  const t = useTranslations("designerInvitation");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [agreements, setAgreements] = useState(false);

  useEffect(() => { Promise.all([fetch(`/api/proxy/designer-invitations/${encodeURIComponent(token)}`), fetch("/api/auth/me")]).then(async ([detailResponse, meResponse]) => { if (detailResponse.ok) { const data = await detailResponse.json(); setDetail(data); setDisplayName(data.displayName ?? ""); } else { const body = await detailResponse.json().catch(() => ({})); setError(body.message || t("invalid")); } setSignedIn(meResponse.ok); setLoading(false); }); }, [t, token]);

  async function accept(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    const endpoint = signedIn ? "accept-existing" : "accept";
    const response = await fetch(`/api/proxy/designer-invitations/${encodeURIComponent(token)}/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, password: signedIn ? undefined : password, agreementsAccepted: agreements }) });
    const body = await response.json().catch(() => ({}));
    if (body.requiresAuthentication) { window.location.href = `/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/designer-invitation/${token}`)}`; return; }
    if (!response.ok) { setError(body.message || t("acceptError")); setSubmitting(false); return; }
    if (body.requiresReauthentication) { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = `/${locale}/auth/login?next=${encodeURIComponent((process.env.NEXT_PUBLIC_DASHBOARD_URL || "") + "/dashboard/designer")}`; return; }
    if (!signedIn) await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: detail?.email, password }) });
    setAccepted(true); setSubmitting(false);
  }

  if (loading) return <div className="mx-auto max-w-2xl px-5 py-16"><Skeleton className="h-96 rounded-3xl" /></div>;
  if (accepted) return <StateCard title={t("acceptedTitle")} description={t("acceptedDescription")}><Link href={(process.env.NEXT_PUBLIC_DASHBOARD_URL || "") + "/dashboard/designer"} className="inline-flex min-h-11 items-center rounded-pill bg-brand-peach px-5 text-sm font-semibold text-white">{t("openDashboard")}</Link></StateCard>;
  if (!detail) return <StateCard title={t("invalidTitle")} description={error || t("invalid")} />;
  if (detail.status !== "PENDING") return <StateCard title={t(`${detail.status.toLowerCase()}Title`)} description={t(`${detail.status.toLowerCase()}Description`)} />;

  return <div className="mx-auto max-w-2xl px-5 py-12 sm:py-20"><Card className="overflow-hidden !p-0"><div className="h-2 bg-gradient-to-r from-brand-blue to-brand-peach" /><div className="p-7 sm:p-10"><div className="flex items-center gap-2"><StatusBadge status="PENDING" /><span className="text-sm text-brand-muted">{t("expires", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(detail.expiresAt)) })}</span></div><h1 className="mt-5 text-3xl font-bold text-brand-ink">{t("title")}</h1><p className="mt-3 text-brand-muted">{t("invitedBy", { name: detail.inviter.displayName })}</p>{detail.personalMessage ? <blockquote className="mt-5 rounded-2xl border-l-4 border-brand-peach bg-brand-peachLight/40 p-4 text-brand-text">{detail.personalMessage}</blockquote> : null}<div className="mt-6 rounded-2xl bg-brand-bg p-5"><h2 className="font-bold text-brand-ink">{t("whatYouCanDo")}</h2><ul className="mt-3 space-y-2 text-sm text-brand-muted">{["upload", "rights", "royalties"].map((key) => <li key={key} className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-semantic-success" />{t(key)}</li>)}</ul></div><form onSubmit={accept} className="mt-7 space-y-4">{signedIn ? <p className="rounded-xl bg-brand-blueLight/35 p-4 text-sm text-brand-ink">{t("signedInConfirm", { email: detail.email })}</p> : <><label className="block text-sm font-semibold text-brand-ink">{t("displayName")}<Input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2" /></label><label className="block text-sm font-semibold text-brand-ink">{t("password")}<Input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2" /></label></>}<label className="flex min-h-11 items-start gap-3 text-sm text-brand-text"><input type="checkbox" required checked={agreements} onChange={(event) => setAgreements(event.target.checked)} className="mt-1 h-4 w-4 rounded text-brand-blue" /><span>{t("agreements")}</span></label>{error ? <p role="alert" className="text-sm text-semantic-dangerText">{error}</p> : null}<Button type="submit" className="w-full" loading={submitting} disabled={submitting || !agreements}><ShieldCheck size={18} /> {t("accept")}</Button></form></div></Card></div>;
}

function StateCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) { return <div className="mx-auto max-w-xl px-5 py-20"><Card className="text-center"><h1 className="text-2xl font-bold text-brand-ink">{title}</h1><p className="mx-auto mt-3 max-w-md text-brand-muted">{description}</p>{children ? <div className="mt-6">{children}</div> : null}</Card></div>; }
