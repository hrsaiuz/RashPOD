"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Globe2, MapPin, Plus, Trash2, XCircle } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, StatusBadge } from "@rashpod/ui";
import DashboardLayout from "../../../dashboard-layout";
import { api, type DesignWorkflowDetail } from "../../../../../lib/api";
import { useAuth } from "../../../../auth/auth-provider";

const REJECTION_REASONS = [
  ["COPYRIGHT_RISK", "Copyright or trademark risk"],
  ["OFFENSIVE_CONTENT", "Offensive or inappropriate content"],
  ["POLITICAL_SENSITIVE_CONTENT", "Political or sensitive content"],
  ["LOW_IMAGE_RESOLUTION", "Low image resolution"],
  ["POOR_IMAGE_QUALITY", "Poor image quality"],
  ["WRONG_FILE_FORMAT", "Wrong file format"],
  ["TRANSPARENCY_OR_BACKGROUND_ISSUE", "Background or transparent file issue"],
  ["NOT_SUITABLE_FOR_PRODUCTION", "Design not suitable for production"],
  ["DUPLICATE_OR_SPAM", "Duplicate or spam design"],
  ["MARKETPLACE_COMPLIANCE_RISK", "Marketplace compliance risk"],
  ["OTHER", "Other"],
] as const;

const MARKETPLACES = [
  ["ETSY", "Etsy"],
  ["EBAY", "eBay"],
  ["SHOPIFY", "Shopify"],
  ["WOOCOMMERCE", "WooCommerce"],
  ["AMAZON", "Amazon"],
] as const;

type BaseProductOption = {
  id: string;
  name: string;
  isActive?: boolean;
  productType?: { name?: string | null } | null;
};

type PlacementPresetOption = {
  id: string;
  name: string;
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL";
  localBaseProductId?: string | null;
  productTemplateId?: string | null;
  placement: string;
  defaultWidthCm?: string | number | null;
  defaultHeightCm?: string | number | null;
  defaultWidthIn?: string | number | null;
  defaultHeightIn?: string | number | null;
  defaultX?: string | number | null;
  defaultY?: string | number | null;
  defaultScale?: string | number | null;
  active?: boolean;
};

type PrintfulTemplateOption = {
  id: string;
  displayName: string;
  active?: boolean;
  defaultTechnique?: string | null;
  allowedTechniques?: unknown;
};

type LocalSelectionForm = {
  id: string;
  localBaseProductId: string;
  placementPresetId: string;
  widthCm: string;
  heightCm: string;
  xCm: string;
  yCm: string;
  scale: string;
  rotation: string;
};

type GlobalSelectionForm = {
  id: string;
  printfulProductTemplateId: string;
  placementPresetId: string;
  widthIn: string;
  heightIn: string;
  leftIn: string;
  topIn: string;
  scale: string;
  technique: string;
  targetMarketplaces: string[];
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [detail, setDetail] = useState<DesignWorkflowDetail | null>(null);
  const [baseProducts, setBaseProducts] = useState<BaseProductOption[]>([]);
  const [placementPresets, setPlacementPresets] = useState<PlacementPresetOption[]>([]);
  const [printfulTemplates, setPrintfulTemplates] = useState<PrintfulTemplateOption[]>([]);
  const [localSelections, setLocalSelections] = useState<LocalSelectionForm[]>([]);
  const [globalSelections, setGlobalSelections] = useState<GlobalSelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");

  const activeBaseProducts = useMemo(() => baseProducts.filter((item) => item.isActive !== false), [baseProducts]);
  const activePrintfulTemplates = useMemo(() => printfulTemplates.filter((item) => item.active !== false), [printfulTemplates]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/moderator/designs/${params.id}`);
      return;
    }
    void load();
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, params.id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setDetail(await api.get<DesignWorkflowDetail>(`/admin/designs/${params.id}/moderation-detail`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load design");
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    setConfigLoading(true);
    try {
      const [products, presets, templates] = await Promise.all([
        api.get<BaseProductOption[]>("/admin/base-products"),
        api.get<PlacementPresetOption[]>("/admin/placement-presets"),
        api.get<PrintfulTemplateOption[]>("/admin/printful/product-templates"),
      ]);
      setBaseProducts(products);
      setPlacementPresets(presets);
      setPrintfulTemplates(templates);
      setLocalSelections((current) => current.length ? current : [createLocalSelection(products, presets)]);
      setGlobalSelections((current) => current.length ? current : [createGlobalSelection(templates, presets)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline configuration");
    } finally {
      setConfigLoading(false);
    }
  }

  function localPresetsFor(productId: string) {
    return placementPresets.filter((item) => item.active !== false && item.pipeline === "LOCAL" && (!item.localBaseProductId || item.localBaseProductId === productId));
  }

  function globalPresetsFor(templateId: string) {
    return placementPresets.filter((item) => item.active !== false && item.pipeline === "GLOBAL_PRINTFUL" && (!item.productTemplateId || item.productTemplateId === templateId));
  }

  function presetPlacement(presetId: string) {
    return placementPresets.find((item) => item.id === presetId)?.placement ?? "FRONT";
  }

  function toggleReason(reason: string) {
    setSelectedReasons((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]));
  }

  function updateLocalSelection(index: number, patch: Partial<LocalSelectionForm>) {
    setLocalSelections((current) => current.map((selection, currentIndex) => currentIndex === index ? { ...selection, ...patch } : selection));
  }

  function selectLocalProduct(index: number, productId: string) {
    const preset = localPresetsFor(productId)[0];
    updateLocalSelection(index, { ...localDefaultsFromPreset(preset), localBaseProductId: productId, placementPresetId: preset?.id ?? "" });
  }

  function selectLocalPreset(index: number, presetId: string) {
    const preset = placementPresets.find((item) => item.id === presetId);
    updateLocalSelection(index, { ...localDefaultsFromPreset(preset), placementPresetId: presetId });
  }

  function updateGlobalSelection(index: number, patch: Partial<GlobalSelectionForm>) {
    setGlobalSelections((current) => current.map((selection, currentIndex) => currentIndex === index ? { ...selection, ...patch } : selection));
  }

  function selectPrintfulTemplate(index: number, templateId: string) {
    const preset = globalPresetsFor(templateId)[0];
    const template = printfulTemplates.find((item) => item.id === templateId);
    updateGlobalSelection(index, { ...globalDefaultsFromPreset(preset), printfulProductTemplateId: templateId, placementPresetId: preset?.id ?? "", technique: defaultTechnique(template) });
  }

  function selectGlobalPreset(index: number, presetId: string) {
    const preset = placementPresets.find((item) => item.id === presetId);
    updateGlobalSelection(index, { ...globalDefaultsFromPreset(preset), placementPresetId: presetId });
  }

  function toggleMarketplace(index: number, marketplace: string) {
    setGlobalSelections((current) => current.map((selection, currentIndex) => {
      if (currentIndex !== index) return selection;
      const targetMarketplaces = selection.targetMarketplaces.includes(marketplace)
        ? selection.targetMarketplaces.filter((item) => item !== marketplace)
        : [...selection.targetMarketplaces, marketplace];
      return { ...selection, targetMarketplaces };
    }));
  }

  function toLocalPayload() {
    return localSelections.map((selection) => ({
      localBaseProductId: selection.localBaseProductId,
      placementPresetId: selection.placementPresetId,
      placement: presetPlacement(selection.placementPresetId),
      position: {
        widthCm: numberValue(selection.widthCm),
        heightCm: numberValue(selection.heightCm),
        xCm: numberValue(selection.xCm),
        yCm: numberValue(selection.yCm),
        scale: numberValue(selection.scale),
        rotation: numberValue(selection.rotation),
      },
    }));
  }

  function toGlobalPayload() {
    return globalSelections.map((selection) => ({
      printfulProductTemplateId: selection.printfulProductTemplateId,
      placementPresetId: selection.placementPresetId,
      placement: presetPlacement(selection.placementPresetId),
      technique: selection.technique,
      targetMarketplaces: selection.targetMarketplaces,
      position: {
        widthIn: numberValue(selection.widthIn),
        heightIn: numberValue(selection.heightIn),
        leftIn: numberValue(selection.leftIn),
        topIn: numberValue(selection.topIn),
        scale: numberValue(selection.scale),
      },
    }));
  }

  async function submitDecision(decision: "APPROVE_LOCAL" | "APPROVE_GLOBAL" | "REJECT") {
    setSubmitting(true);
    setError("");
    try {
      const payload = decision === "REJECT"
        ? { decision, rejectionReasons: selectedReasons, customRejectionReason: customReason || undefined, moderatorNotes: notes || undefined }
        : { decision, localSelections: toLocalPayload(), globalPrintfulSelections: decision === "APPROVE_GLOBAL" ? toGlobalPayload() : undefined, moderatorNotes: notes || undefined };
      setDetail(await api.post<DesignWorkflowDetail>(`/admin/designs/${params.id}/moderation-decision`, payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit moderation decision");
    } finally {
      setSubmitting(false);
    }
  }

  const latest = detail?.versions?.[0];

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard/moderator/designs">
            <Button variant="ghost"><ArrowLeft size={18} /> Back to queue</Button>
          </Link>
          {detail ? <StatusBadge status={detail.status} /> : null}
        </div>

        {error ? <ErrorState title="Moderation issue" description={error} retry={<Button onClick={load}>Retry</Button>} /> : null}

        {loading ? (
          <Card><p className="text-brand-muted">Loading design...</p></Card>
        ) : !detail ? (
          <EmptyState title="Design not found" description="This moderation item is no longer available." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <Card>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-brand-ink">{detail.title}</h1>
                    <p className="mt-1 text-brand-muted">{detail.description || "No description provided."}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Designer" value={detail.designer?.displayName ?? detail.designer?.email ?? "Unknown"} />
                  <Info label="Resolution" value={latest?.widthPx && latest?.heightPx ? `${latest.widthPx} x ${latest.heightPx}px` : "Pending"} />
                  <Info label="DPI" value={latest?.dpi ? String(latest.dpi) : "Not detected"} />
                  <Info label="Transparency" value={latest?.hasTransparency ? "Detected" : "Unknown"} />
                </div>
              </Card>

              <Card>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-brand-ink">Pipeline Decisions</h2>
                    <p className="mt-1 text-sm text-brand-muted">{configLoading ? "Loading product configuration..." : `${activeBaseProducts.length} local products, ${activePrintfulTemplates.length} global templates`}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadConfig} disabled={configLoading}>Refresh</Button>
                </div>

                <div className="space-y-5">
                  <DecisionSection icon={<MapPin size={20} />} title="Local Products">
                    <div className="space-y-4">
                      {localSelections.map((selection, index) => (
                        <SelectionPanel key={selection.id} title={`Local selection ${index + 1}`} onRemove={localSelections.length > 1 ? () => setLocalSelections((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}>
                          <div className="grid gap-3 md:grid-cols-2">
                            <SelectField label="Product" value={selection.localBaseProductId} onChange={(value) => selectLocalProduct(index, value)} options={activeBaseProducts.map((item) => ({ value: item.id, label: item.productType?.name ? `${item.name} (${item.productType.name})` : item.name }))} />
                            <SelectField label="Placement" value={selection.placementPresetId} onChange={(value) => selectLocalPreset(index, value)} options={localPresetsFor(selection.localBaseProductId).map((item) => ({ value: item.id, label: `${item.name} - ${item.placement}` }))} />
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <NumberField label="Width cm" value={selection.widthCm} onChange={(value) => updateLocalSelection(index, { widthCm: value })} />
                            <NumberField label="Height cm" value={selection.heightCm} onChange={(value) => updateLocalSelection(index, { heightCm: value })} />
                            <NumberField label="X cm" value={selection.xCm} onChange={(value) => updateLocalSelection(index, { xCm: value })} />
                            <NumberField label="Y cm" value={selection.yCm} onChange={(value) => updateLocalSelection(index, { yCm: value })} />
                            <NumberField label="Scale" value={selection.scale} onChange={(value) => updateLocalSelection(index, { scale: value })} />
                            <NumberField label="Rotation" value={selection.rotation} onChange={(value) => updateLocalSelection(index, { rotation: value })} />
                          </div>
                        </SelectionPanel>
                      ))}
                      <Button variant="secondary" size="sm" onClick={() => setLocalSelections((current) => [...current, createLocalSelection(baseProducts, placementPresets)])} disabled={configLoading}>
                        <Plus size={16} /> Add Local Product
                      </Button>
                    </div>
                  </DecisionSection>

                  <DecisionSection icon={<Globe2 size={20} />} title="Global Printful Products">
                    <div className="space-y-4">
                      {globalSelections.map((selection, index) => (
                        <SelectionPanel key={selection.id} title={`Global selection ${index + 1}`} onRemove={globalSelections.length > 1 ? () => setGlobalSelections((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}>
                          <div className="grid gap-3 md:grid-cols-2">
                            <SelectField label="Template" value={selection.printfulProductTemplateId} onChange={(value) => selectPrintfulTemplate(index, value)} options={activePrintfulTemplates.map((item) => ({ value: item.id, label: item.displayName }))} />
                            <SelectField label="Placement" value={selection.placementPresetId} onChange={(value) => selectGlobalPreset(index, value)} options={globalPresetsFor(selection.printfulProductTemplateId).map((item) => ({ value: item.id, label: `${item.name} - ${item.placement}` }))} />
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <NumberField label="Width in" value={selection.widthIn} onChange={(value) => updateGlobalSelection(index, { widthIn: value })} />
                            <NumberField label="Height in" value={selection.heightIn} onChange={(value) => updateGlobalSelection(index, { heightIn: value })} />
                            <NumberField label="Left in" value={selection.leftIn} onChange={(value) => updateGlobalSelection(index, { leftIn: value })} />
                            <NumberField label="Top in" value={selection.topIn} onChange={(value) => updateGlobalSelection(index, { topIn: value })} />
                            <NumberField label="Scale" value={selection.scale} onChange={(value) => updateGlobalSelection(index, { scale: value })} />
                            <TextField label="Technique" value={selection.technique} onChange={(value) => updateGlobalSelection(index, { technique: value })} />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {MARKETPLACES.map(([value, label]) => (
                              <label key={value} className="flex min-h-11 items-center gap-2 rounded-pill border border-surface-borderSoft px-3 text-sm text-brand-ink">
                                <input type="checkbox" checked={selection.targetMarketplaces.includes(value)} onChange={() => toggleMarketplace(index, value)} />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </SelectionPanel>
                      ))}
                      <Button variant="secondary" size="sm" onClick={() => setGlobalSelections((current) => [...current, createGlobalSelection(printfulTemplates, placementPresets)])} disabled={configLoading}>
                        <Plus size={16} /> Add Global Product
                      </Button>
                    </div>
                  </DecisionSection>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => submitDecision("APPROVE_LOCAL")} disabled={submitting || configLoading || !localSelections.length} loading={submitting}>
                    <MapPin size={18} /> Approve Local
                  </Button>
                  <Button variant="primaryPeach" onClick={() => submitDecision("APPROVE_GLOBAL")} disabled={submitting || configLoading || !globalSelections.length} loading={submitting}>
                    <Globe2 size={18} /> Approve Global
                  </Button>
                </div>
              </Card>

              <Card>
                <h2 className="mb-4 text-xl font-semibold text-brand-ink">Workflow History</h2>
                {detail.moderationAudits?.length ? (
                  <div className="space-y-3">
                    {detail.moderationAudits.map((audit) => (
                      <div key={audit.id} className="rounded-xl border border-surface-borderSoft p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={audit.afterStatus} />
                          <span className="text-sm text-brand-muted">{new Date(audit.createdAt).toLocaleString()}</span>
                        </div>
                        {audit.notes ? <p className="mt-2 text-sm text-brand-muted">{audit.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-muted">No moderation decisions recorded yet.</p>
                )}
              </Card>
            </div>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-status-danger" />
                <h2 className="text-xl font-semibold text-brand-ink">Reject Design</h2>
              </div>
              <div className="space-y-3">
                {REJECTION_REASONS.map(([value, label]) => (
                  <label key={value} className="flex min-h-11 items-center gap-3 rounded-xl border border-surface-borderSoft px-3 py-2 text-sm text-brand-ink">
                    <input type="checkbox" checked={selectedReasons.includes(value)} onChange={() => toggleReason(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label className="mt-4 block text-sm font-medium text-brand-ink" htmlFor="customReason">Custom reason</label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-surface-borderSoft bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
              <label className="mt-4 block text-sm font-medium text-brand-ink" htmlFor="notes">Internal notes</label>
              <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional moderator note" className="mt-2" />
              <Button className="mt-5 w-full" variant="danger" onClick={() => submitDecision("REJECT")} disabled={submitting} loading={submitting}>
                <XCircle size={18} /> Submit Rejection
              </Button>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function createLocalSelection(products: BaseProductOption[], presets: PlacementPresetOption[]): LocalSelectionForm {
  const product = products.find((item) => item.isActive !== false);
  const preset = presets.find((item) => item.active !== false && item.pipeline === "LOCAL" && (!item.localBaseProductId || item.localBaseProductId === product?.id));
  return { id: crypto.randomUUID(), localBaseProductId: product?.id ?? "", placementPresetId: preset?.id ?? "", ...localDefaultsFromPreset(preset) };
}

function createGlobalSelection(templates: PrintfulTemplateOption[], presets: PlacementPresetOption[]): GlobalSelectionForm {
  const template = templates.find((item) => item.active !== false);
  const preset = presets.find((item) => item.active !== false && item.pipeline === "GLOBAL_PRINTFUL" && (!item.productTemplateId || item.productTemplateId === template?.id));
  return { id: crypto.randomUUID(), printfulProductTemplateId: template?.id ?? "", placementPresetId: preset?.id ?? "", technique: defaultTechnique(template), targetMarketplaces: ["ETSY"], ...globalDefaultsFromPreset(preset) };
}

function localDefaultsFromPreset(preset?: PlacementPresetOption): Omit<LocalSelectionForm, "id" | "localBaseProductId" | "placementPresetId"> {
  return {
    widthCm: stringValue(preset?.defaultWidthCm, "10"),
    heightCm: stringValue(preset?.defaultHeightCm, "10"),
    xCm: stringValue(preset?.defaultX, "0"),
    yCm: stringValue(preset?.defaultY, "0"),
    scale: stringValue(preset?.defaultScale, "1"),
    rotation: "0",
  };
}

function globalDefaultsFromPreset(preset?: PlacementPresetOption): Omit<GlobalSelectionForm, "id" | "printfulProductTemplateId" | "placementPresetId" | "technique" | "targetMarketplaces"> {
  return {
    widthIn: stringValue(preset?.defaultWidthIn, "4"),
    heightIn: stringValue(preset?.defaultHeightIn, "4"),
    leftIn: stringValue(preset?.defaultX, "0"),
    topIn: stringValue(preset?.defaultY, "0"),
    scale: stringValue(preset?.defaultScale, "1"),
  };
}

function defaultTechnique(template?: PrintfulTemplateOption) {
  if (template?.defaultTechnique) return template.defaultTechnique;
  const allowed = Array.isArray(template?.allowedTechniques) ? template.allowedTechniques.filter((item): item is string => typeof item === "string") : [];
  return allowed[0] ?? "dtg";
}

function stringValue(value: unknown, fallback: string) {
  if (value == null || value === "") return fallback;
  return String(value);
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-borderSoft p-4">
      <p className="text-xs font-medium uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  );
}

function DecisionSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-surface-borderSoft bg-white/70 p-4">
      <div className="mb-4 flex items-center gap-2 text-brand-blue">
        {icon}
        <h3 className="font-semibold text-brand-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SelectionPanel({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-borderSoft bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-brand-ink">{title}</h4>
        {onRemove ? (
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${title}`}>
            <Trash2 size={16} /> Remove
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block text-sm font-medium text-brand-ink">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue">
        <option value="">Select</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <TextField label={label} value={value} onChange={onChange} type="number" />;
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-brand-ink">
      {label}
      <input value={value} type={type} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue" />
    </label>
  );
}
