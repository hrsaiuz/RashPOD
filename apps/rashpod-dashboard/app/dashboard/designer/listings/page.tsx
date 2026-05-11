"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@rashpod/ui";
import { Plus, Sparkles, Tag } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type Design, type Listing } from "../../../../lib/api";

export default function DesignerListingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    designAssetId: "",
    type: "PRODUCT",
    title: "",
    description: "",
    price: "",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/listings");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [d, l] = await Promise.all([api.get<Design[]>("/designs"), api.get<Listing[]>("/listings")]);
      setDesigns(d);
      setListings(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  const approvedDesigns = useMemo(
    () => designs.filter((d) => ["APPROVED", "READY_FOR_MOCKUP", "READY_TO_PUBLISH", "PUBLISHED"].includes(d.status)),
    [designs],
  );

  async function aiAssist() {
    if (!form.title && !form.description) return;
    setAiLoading(true);
    try {
      const res = await api.post<{ title?: string; description?: string; tags?: string[] }>("/ai/listing-copy", {
        titleHint: form.title,
        descriptionHint: form.description,
      });
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        description: res.description || f.description,
      }));
    } catch {
      // ignore — endpoint may be gated
    } finally {
      setAiLoading(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const created = await api.post<Listing>("/listings", {
        designAssetId: form.designAssetId,
        type: form.type,
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
      });
      setCreateOpen(false);
      setForm({ designAssetId: "", type: "PRODUCT", title: "", description: "", price: "" });
      router.push(`/dashboard/designer/listings/${created.id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: DataTableColumn<Listing>[] = [
    {
      key: "title",
      header: "Title",
      render: (_v, l) => (
        <Link href={`/dashboard/designer/listings/${l.id}`} className="font-medium text-brand-ink hover:text-brand-blue">
          {l.title}
        </Link>
      ),
    },
    { key: "type", header: "Type", render: (_v, l) => <StatusBadge status={l.type} /> },
    { key: "status", header: "Status", render: (_v, l) => <StatusBadge status={l.status} /> },
    {
      key: "price",
      header: "Price",
      render: (_v, l) => <span className="tabular-nums text-sm text-brand-ink">{l.price} {l.currency}</span>,
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (_v, l) => <span className="text-xs text-brand-muted">{new Date(l.updatedAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">My Listings</h1>
            <p className="text-brand-muted mt-1">Storefront listings powered by your approved designs.</p>
          </div>
          <Button
            variant="primaryBlue"
            disabled={approvedDesigns.length === 0}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> New listing
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<Tag className="text-brand-muted" size={32} />}
            title="No listings yet"
            description={
              approvedDesigns.length > 0
                ? "Create your first listing from an approved design."
                : "You need at least one approved design before creating a listing."
            }
            action={
              approvedDesigns.length > 0 ? (
                <Button variant="primaryBlue" onClick={() => setCreateOpen(true)}>
                  <Plus size={16} /> New listing
                </Button>
              ) : (
                <Link href="/dashboard/designer/designs/new">
                  <Button variant="primaryBlue">Upload design</Button>
                </Link>
              )
            }
          />
        ) : (
          <Card>
            <DataTable rows={listings} columns={columns} mobileMode="cards" />
          </Card>
        )}

        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create listing"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                variant="primaryBlue"
                loading={submitting}
                disabled={!form.designAssetId || !form.title || !form.price}
                onClick={(e) => onCreate(e as unknown as FormEvent)}
              >
                Create
              </Button>
            </div>
          }
        >
          <form onSubmit={onCreate} className="space-y-4">
            <FormField label="Design" required>
              <Select value={form.designAssetId} onChange={(e) => setForm({ ...form, designAssetId: e.target.value })} required>
                <option value="">Select an approved design…</option>
                {approvedDesigns.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PRODUCT">Product</option>
                <option value="FILM">Film (DTF / UV-DTF)</option>
              </Select>
            </FormField>
            <FormField label="Title" required>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </FormField>
            <FormField label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <div>
              <Button variant="ghost" size="sm" type="button" loading={aiLoading} onClick={aiAssist}>
                <Sparkles size={14} /> AI: improve copy
              </Button>
            </div>
            <FormField label="Price (UZS)" required>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </FormField>
            {submitError && <p className="text-sm text-semantic-danger">{submitError}</p>}
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
