"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Modal,
  Skeleton,
} from "@rashpod/ui";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "../../../../../auth/auth-provider";
import DashboardLayout from "../../../../dashboard-layout";
import { api, type CommercialRights } from "../../../../../../lib/api";

export default function CommercialRightsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const id = String(params.id);

  const [rights, setRights] = useState<CommercialRights | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmFilm, setConfirmFilm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/designer/designs/${id}/rights`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await api.get<CommercialRights | null>(`/designs/${id}/commercial-rights`);
      setRights(
        r ?? {
          id: "",
          designAssetId: id,
          allowProductSales: false,
          allowMarketplacePublishing: false,
          allowFilmSales: false,
          allowCorporateBidding: false,
          filmRoyaltyRate: null,
          filmConsentGrantedAt: null,
          filmConsentRevokedAt: null,
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rights");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof CommercialRights>(key: K, value: CommercialRights[K]) {
    setRights((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!rights) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/designs/${id}/commercial-rights`, {
        allowProductSales: rights.allowProductSales,
        allowMarketplacePublishing: rights.allowMarketplacePublishing,
        allowCorporateBidding: rights.allowCorporateBidding,
        filmRoyaltyRate: rights.filmRoyaltyRate ?? null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFilm(enable: boolean) {
    if (enable) {
      setConfirmFilm(true);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/designs/${id}/disable-film-sales`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEnableFilm() {
    setSaving(true);
    setConfirmFilm(false);
    try {
      await api.post(`/designs/${id}/enable-film-sales`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable film sales");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6 max-w-3xl">
        <Link
          href={`/dashboard/designer/designs/${id}`}
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft size={16} /> Back to design
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Commercial Rights</h1>
          <p className="text-brand-muted">
            Control how this design may be used commercially. Film-sale consent is separate from product sales.
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : rights ? (
          <>
            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-4">Product sales</h2>
              <div className="space-y-3">
                <ToggleRow
                  label="Allow product sales"
                  description="This design may be sold on physical products (T-shirts, hoodies, posters, etc.)"
                  on={rights.allowProductSales}
                  onChange={(v) => update("allowProductSales", v)}
                />
                <ToggleRow
                  label="Allow marketplace publishing"
                  description="Listings using this design may be published to external marketplaces."
                  on={rights.allowMarketplacePublishing}
                  onChange={(v) => update("allowMarketplacePublishing", v)}
                />
                <ToggleRow
                  label="Allow corporate bidding"
                  description="This design may be offered in response to corporate B2B requests."
                  on={rights.allowCorporateBidding}
                  onChange={(v) => update("allowCorporateBidding", v)}
                />
              </div>
              <div className="mt-6">
                <Button variant="primaryBlue" loading={saving} onClick={save}>
                  <Save size={16} /> Save changes
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-brand-peach mt-0.5" size={20} />
                <div>
                  <h2 className="text-lg font-semibold text-brand-ink">Film-sale rights (DTF / UV-DTF)</h2>
                  <p className="text-sm text-brand-muted">
                    Enabling film sales gives explicit consent for your design to be sold as a transfer film. This is
                    independent from product sales. You can revoke at any time.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <ToggleRow
                  label="Allow film sales"
                  description={
                    rights.allowFilmSales
                      ? rights.filmConsentGrantedAt
                        ? `Consent granted ${new Date(rights.filmConsentGrantedAt).toLocaleDateString()}`
                        : "Enabled"
                      : "Disabled"
                  }
                  on={rights.allowFilmSales}
                  onChange={toggleFilm}
                />
                <FormField
                  label="Film royalty rate"
                  helperText="Percentage you earn per film sale. Subject to admin-configured min/max."
                >
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={50}
                    value={rights.filmRoyaltyRate ?? ""}
                    onChange={(e) =>
                      update("filmRoyaltyRate", e.target.value === "" ? null : Number(e.target.value))
                    }
                    placeholder="e.g. 15"
                  />
                </FormField>
              </div>
            </Card>
          </>
        ) : null}

        <Modal
          open={confirmFilm}
          onClose={() => setConfirmFilm(false)}
          title="Enable film sales?"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmFilm(false)}>Cancel</Button>
              <Button variant="primaryPeach" loading={saving} onClick={confirmEnableFilm}>I consent</Button>
            </div>
          }
        >
          <p className="text-sm text-brand-ink mb-2">
            You are about to grant <strong>explicit consent</strong> for this design to be sold as transfer film
            (DTF/UV-DTF) on the RashPOD marketplace.
          </p>
          <p className="text-sm text-brand-muted">
            This is a separate right from product sales. Your royalty rate applies per film sale. You can disable
            this at any time, but films already sold are not recalled.
          </p>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

function ToggleRow({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description?: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-card hover:bg-surface-borderSoft transition-colors"
    >
      <div className="flex-1">
        <div className="font-medium text-brand-ink">{label}</div>
        {description && <div className="text-xs text-brand-muted mt-0.5">{description}</div>}
      </div>
      <span
        className={
          "w-11 h-6 rounded-full p-0.5 transition-colors inline-block " +
          (on ? "bg-brand-blue" : "bg-surface-border")
        }
      >
        <span
          className={
            "block w-5 h-5 bg-white rounded-full shadow transition-transform " + (on ? "translate-x-5" : "")
          }
        />
      </span>
    </button>
  );
}
