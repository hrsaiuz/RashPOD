"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@rashpod/ui";
import { ArrowLeft, Save, Send, Archive, Languages } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { api, type Listing } from "../../../../../lib/api";

export default function ListingEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const id = String(params.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"" | "save" | "publish" | "archive">("");
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [translating, setTranslating] = useState<"" | "uz" | "ru" | "en">("");

  async function translateTo(lang: "uz" | "ru" | "en") {
    setTranslating(lang);
    setMessage(null);
    try {
      const [titleRes, descRes] = await Promise.all([
        form.title
          ? api.post<{ translatedText: string }>("/ai/translate", { text: form.title, targetLanguage: lang })
          : Promise.resolve({ translatedText: "" }),
        form.description
          ? api.post<{ translatedText: string }>("/ai/translate", { text: form.description, targetLanguage: lang })
          : Promise.resolve({ translatedText: "" }),
      ]);
      setForm((prev) => ({
        ...prev,
        title: titleRes.translatedText || prev.title,
        description: descRes.translatedText || prev.description,
      }));
      setMessage({ kind: "ok", text: `Translated to ${lang.toUpperCase()}. Review and Save to persist.` });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Translation failed" });
    } finally {
      setTranslating("");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/designer/listings/${id}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const all = await api.get<Listing[]>("/listings");
      const found = all.find((l) => l.id === id);
      if (!found) {
        setError("Listing not found.");
      } else {
        setListing(found);
        setForm({
          title: found.title,
          description: found.description ?? "",
          price: String(found.price ?? ""),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving("save");
    setMessage(null);
    try {
      await api.patch(`/listings/${id}`, {
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
      });
      setMessage({ kind: "ok", text: "Saved." });
      await load();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving("");
    }
  }

  async function publish() {
    setSaving("publish");
    try {
      await api.post(`/listings/${id}/publish`);
      await load();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setSaving("");
    }
  }

  async function archive() {
    setSaving("archive");
    try {
      await api.post(`/listings/${id}/archive`);
      await load();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Archive failed" });
    } finally {
      setSaving("");
    }
  }

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6 max-w-3xl">
        <Link href="/dashboard/designer/listings" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
          <ArrowLeft size={16} /> Back to listings
        </Link>

        {loading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : listing ? (
          <>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-bold text-brand-ink">{listing.title}</h1>
                <p className="text-brand-muted mt-1">Listing • {listing.type} • {listing.currency}</p>
              </div>
              <StatusBadge status={listing.status} />
            </div>

            <Card>
              <div className="space-y-4">
                <FormField label="Title">
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </FormField>
                <FormField label="Description">
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </FormField>
                <FormField label="Price (UZS)">
                  <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </FormField>

                <div className="rounded-2xl border border-brand-line bg-brand-bg/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-brand-ink">
                    <Languages size={16} className="text-brand-blue" /> AI translation
                  </div>
                  <p className="text-xs text-brand-muted mt-1">
                    Translate the title and description into UZ / RU / EN. Review and Save to persist.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["uz", "ru", "en"] as const).map((lang) => (
                      <Button
                        key={lang}
                        size="sm"
                        variant="ghost"
                        loading={translating === lang}
                        disabled={!!translating || (!form.title && !form.description)}
                        onClick={() => translateTo(lang)}
                      >
                        Translate → {lang.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {message && (
                  <p className={"text-sm " + (message.kind === "ok" ? "text-semantic-success" : "text-semantic-danger")}>
                    {message.text}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="primaryBlue" loading={saving === "save"} onClick={save}>
                    <Save size={16} /> Save
                  </Button>
                  <Button
                    variant="primaryPeach"
                    loading={saving === "publish"}
                    disabled={listing.status === "PUBLISHED"}
                    onClick={publish}
                  >
                    <Send size={16} /> Publish
                  </Button>
                  <Button
                    variant="ghost"
                    loading={saving === "archive"}
                    disabled={listing.status === "ARCHIVED"}
                    onClick={archive}
                  >
                    <Archive size={16} /> Archive
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-2">Performance</h2>
              <p className="text-sm text-brand-muted">Views and sales analytics ship with v1.1.</p>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
