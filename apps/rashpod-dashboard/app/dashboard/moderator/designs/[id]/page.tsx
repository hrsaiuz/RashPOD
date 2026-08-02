"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, FileText, Globe2, Image as ImageIcon, Loader2, MapPin, Plus, Trash2, XCircle } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Input, ProductPickerGrid, Skeleton, StatusBadge } from "@rashpod/ui";
import { clampPlacementToPrintArea, presetToInitialPlacement, toLocalSelectionPosition } from "@rashpod/mockup";
import DashboardLayout from "../../../dashboard-layout";
import { api, ApiError, type DesignWorkflowDetail } from "../../../../../lib/api";
import { useAuth } from "../../../../auth/auth-provider";
import { ModeratorListingWizard } from "../../moderator-listing-wizard";
import { GlobalSelectionMockupEditor, LocalSelectionMockupEditor } from "../../../../../components/mockup";
import { DesignPreviewCard } from "../../../../../components/design/DesignPreviewCard";
import { ModeratorDesignStoryReview } from "../../../../../components/design-story/ModeratorDesignStoryReview";
import { PrintfulModerationCatalog, type PreparedPrintfulProduct, type PrintfulCatalogVariant } from "../../../../../components/moderator/PrintfulModerationCatalog";
import { isMockupConfigurationFailure, isMockupRetryable, MockupErrorHint, PlacementChips, ReadinessChecklist } from "../../moderator-pipeline-helpers";
import { buildModerationDecisionPayload } from "./moderation-decision-payload";
import { moderatorPrintAreasForTemplate, preferredAreaForPreset } from "./local-print-area-selection";
import { useToast } from "../../../../../components/feedback/toast-provider";
import { inferWorkflowStep, placementArtworkAvailable, type WorkflowStep } from "./moderation-workflow";

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
  imageUrl?: string | null;
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
  providerPlacement?: string | null;
  defaultWidthCm?: string | number | null;
  defaultHeightCm?: string | number | null;
  defaultWidthIn?: string | number | null;
  defaultHeightIn?: string | number | null;
  defaultX?: string | number | null;
  defaultY?: string | number | null;
  defaultScale?: string | number | null;
  alignment?: string | null;
  active?: boolean;
};

type MockupTemplateOption = {
  id: string;
  baseProductId: string;
  name: string;
  baseImageKey: string;
  lifestyleImageKey?: string | null;
  closeupImageKey?: string | null;
  isActive?: boolean;
};

type PrintAreaOption = {
  id: string;
  mockupTemplateId: string;
  defaultPresetId?: string | null;
  mockupViewId?: string | null;
  mockupView?: {
    id: string;
    name: string;
    viewKey: string;
    placementCode: string;
    blankImageKey: string;
    isPrimary: boolean;
    isActive: boolean;
  } | null;
  name: string;
  placement?: string | null;
  widthCm?: number | null;
  heightCm?: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
  allowMove: boolean;
  allowResize: boolean;
  allowRotate: boolean;
  minScale: number;
  maxScale: number;
  isActive?: boolean;
};

type PrintfulTemplateOption = {
  id: string;
  printfulCatalogProductId?: string | null;
  displayName: string;
  previewImageUrl?: string | null;
  active?: boolean;
  defaultTechnique?: string | null;
  defaultPlacement?: string | null;
  rashpodProductType?: string | null;
  allowedTechniques?: unknown;
  allowedPlacements?: unknown;
  allowedColorVariantIds?: unknown;
  allowedSizeVariantIds?: unknown;
  printfulVariantIds?: unknown;
  variantOptions?: PrintfulCatalogVariant[];
};

type PipelineMode = "uzbek" | "global";
type LocalSelectionForm = {
  id: string;
  compositionKey: string;
  localBaseProductId: string;
  mockupTemplateId: string;
  printAreaId: string;
  placementPresetId: string;
  unit: "CM" | "PX";
  anchor: "TOP_LEFT" | "CENTER";
  widthCm: string;
  heightCm: string;
  xCm: string;
  yCm: string;
  widthPx: string;
  heightPx: string;
  xPx: string;
  yPx: string;
  scale: string;
  rotation: string;
  editorReady: boolean;
  preferContextInitialPlacement: boolean;
};

type GlobalSelectionForm = {
  id: string;
  compositionKey: string;
  printfulProductTemplateId: string;
  placementPresetId: string;
  widthIn: string;
  heightIn: string;
  leftIn: string;
  topIn: string;
  scale: string;
  technique: string;
  targetMarketplaces: string[];
  selectedVariantIds: string[];
  previewTaskKey?: string;
  previewUrls?: string[];
  previewLoading?: boolean;
  editorReady: boolean;
  preferContextInitialPlacement: boolean;
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [detail, setDetail] = useState<DesignWorkflowDetail | null>(null);
  const [baseProducts, setBaseProducts] = useState<BaseProductOption[]>([]);
  const [placementPresets, setPlacementPresets] = useState<PlacementPresetOption[]>([]);
  const [mockupTemplates, setMockupTemplates] = useState<MockupTemplateOption[]>([]);
  const [printAreas, setPrintAreas] = useState<PrintAreaOption[]>([]);
  const [printfulTemplates, setPrintfulTemplates] = useState<PrintfulTemplateOption[]>([]);
  const [localSelections, setLocalSelections] = useState<LocalSelectionForm[]>([]);
  const [globalSelections, setGlobalSelections] = useState<GlobalSelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadNotFound, setLoadNotFound] = useState(false);
  const [configError, setConfigError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"APPROVE_LOCAL" | "APPROVE_GLOBAL" | "REJECT" | null>(null);
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>("uzbek");
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(1);
  const [expandedLocal, setExpandedLocal] = useState<Record<string, boolean>>({});
  const [expandedGlobalNumeric, setExpandedGlobalNumeric] = useState<Record<string, boolean>>({});
  const [highlightMockups, setHighlightMockups] = useState(false);
  const mockupSectionRef = useRef<HTMLDivElement>(null);
  const prevMockupPending = useRef(false);
  const configLoadedRef = useRef(false);
  const initialWorkflowStepSetRef = useRef(false);
  const pendingScrollTargetRef = useRef<string | null>(null);
  const previewControllersRef = useRef(new Map<string, AbortController>());

  const activeBaseProducts = useMemo(() => baseProducts.filter((item) => item.isActive !== false), [baseProducts]);
  const activeMockupTemplates = useMemo(() => mockupTemplates.filter((item) => item.isActive !== false), [mockupTemplates]);
  const activePrintfulTemplates = useMemo(() => printfulTemplates.filter((item) => item.active !== false), [printfulTemplates]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/moderator/designs/${params.id}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, params.id]);

  const canModerate = useMemo(() => {
    if (!detail) return false;
    return ["SUBMITTED", "PENDING_MODERATION"].includes(detail.status);
  }, [detail]);

  useEffect(() => {
    if (!canModerate || configLoadedRef.current) return;
    configLoadedRef.current = true;
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canModerate]);

  useEffect(() => () => {
    previewControllersRef.current.forEach((controller) => controller.abort());
    previewControllersRef.current.clear();
  }, []);

  const mockupPending = useMemo(
    () => detail?.productSelections?.some((selection) => ["MOCKUP_PENDING", "MOCKUP_GENERATING"].includes(selection.status)) ?? false,
    [detail?.productSelections],
  );

  useEffect(() => {
    if (!mockupPending) return;
    const timer = window.setInterval(() => {
      void pollMockupStatus();
    }, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockupPending, params.id]);

  async function pollMockupStatus() {
    try {
      const status = await api.get<{ pending: boolean }>(`/admin/designs/${params.id}/mockup-status`);
      if (!status.pending) await load({ background: true });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to refresh mockup status");
    }
  }

  useEffect(() => {
    if (prevMockupPending.current && !mockupPending && detail?.productSelections?.length) {
      setHighlightMockups(true);
      mockupSectionRef.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
      const timer = window.setTimeout(() => setHighlightMockups(false), 4000);
      return () => window.clearTimeout(timer);
    }
    prevMockupPending.current = mockupPending;
  }, [mockupPending, detail?.productSelections?.length]);

  async function load(options: { background?: boolean } = {}) {
    if (!options.background) {
      setLoading(true);
      setLoadError("");
      setLoadNotFound(false);
    }
    try {
      const next = await api.get<DesignWorkflowDetail>(`/admin/designs/${params.id}/moderation-detail`);
      setDetail(next);
      if (!initialWorkflowStepSetRef.current) {
        setWorkflowStep(inferWorkflowStep(next));
        initialWorkflowStepSetRef.current = true;
      }
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setLoadNotFound(true);
        setDetail(null);
      } else {
        setLoadError(e instanceof Error ? e.message : "Failed to load design");
        if (!options.background) setDetail(null);
      }
      return null;
    } finally {
      if (!options.background) setLoading(false);
    }
  }

  async function loadConfig() {
    setConfigLoading(true);
    setConfigError("");
    try {
      const [products, presets, templates, areas, printful] = await Promise.all([
        api.get<BaseProductOption[]>("/admin/base-products"),
        api.get<PlacementPresetOption[]>("/admin/placement-presets"),
        api.get<MockupTemplateOption[]>("/admin/mockup-templates"),
        api.get<PrintAreaOption[]>("/admin/print-areas"),
        api.get<PrintfulTemplateOption[]>("/admin/printful/product-templates"),
      ]);
      setBaseProducts(products);
      setPlacementPresets(presets);
      setMockupTemplates(templates);
      setPrintAreas(areas);
      setPrintfulTemplates(printful);
      setLocalSelections((current) => current.length ? current : [createLocalSelection(products, presets, templates, areas, detail?.versions)]);
      setGlobalSelections((current) => current.length ? current : [createGlobalSelection(printful, presets, detail?.versions)]);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "Failed to load pipeline configuration");
    } finally {
      setConfigLoading(false);
    }
  }

  function localPresetsFor(productId: string) {
    return placementPresets.filter((item) => item.active !== false
      && item.pipeline === "LOCAL"
      && (!item.localBaseProductId || item.localBaseProductId === productId)
      && placementArtworkAvailable(detail?.versions, item.placement));
  }

  function localTemplatesFor(productId: string) {
    return activeMockupTemplates.filter((item) => item.baseProductId === productId);
  }

  function printAreasFor(templateId: string) {
    return moderatorPrintAreasForTemplate(printAreas, templateId);
  }

  function artworkPrintAreasFor(templateId: string) {
    return printAreasFor(templateId).filter((item) => placementArtworkAvailable(
      detail?.versions,
      item.placement ?? item.mockupView?.placementCode ?? "FRONT",
    ));
  }

  function globalPresetsFor(templateId: string) {
    return placementPresets.filter((item) => item.active !== false
      && item.pipeline === "GLOBAL_PRINTFUL"
      && (!item.productTemplateId || item.productTemplateId === templateId)
      && placementArtworkAvailable(detail?.versions, item.providerPlacement ?? item.placement));
  }

  function presetPlacement(presetId: string) {
    const preset = placementPresets.find((item) => item.id === presetId);
    return preset?.providerPlacement ?? preset?.placement ?? "front";
  }

  function toggleReason(reason: string) {
    setSelectedReasons((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]));
  }

  function updateLocalSelection(index: number, patch: Partial<LocalSelectionForm>) {
    setLocalSelections((current) => current.map((selection, currentIndex) => currentIndex === index ? { ...selection, ...patch } : selection));
  }

  function selectLocalProduct(index: number, productId: string) {
    const presets = localPresetsFor(productId);
    const template = localTemplatesFor(productId)[0];
    const areas = template ? artworkPrintAreasFor(template.id) : [];
    const compositionKey = localSelections[index]?.compositionKey;
    setLocalSelections((current) => {
      let placementIndex = 0;
      return current.map((selection) => {
        if (selection.compositionKey !== compositionKey) return selection;
        const area = areas[placementIndex] ?? areas[0];
        placementIndex += 1;
        const preset = presets.find((item) => item.id === area?.defaultPresetId)
          ?? presets.find((item) => item.placement === area?.placement)
          ?? presets.find((item) => item.name.toLowerCase().includes("center"))
          ?? presets[0];
        return { ...selection, ...localDefaultsFromPreset(preset, area), localBaseProductId: productId, placementPresetId: preset?.id ?? "", mockupTemplateId: template?.id ?? "", printAreaId: area?.id ?? "" };
      });
    });
  }

  function selectLocalPlacementChip(index: number, presetId: string) {
    selectLocalPreset(index, presetId);
  }

  function selectLocalPreset(index: number, presetId: string) {
    const preset = placementPresets.find((item) => item.id === presetId);
    const current = localSelections[index];
    const candidates = printAreasFor(current.mockupTemplateId);
    const area = preferredAreaForPreset(candidates, preset, current.printAreaId);
    updateLocalSelection(index, { ...localDefaultsFromPreset(preset, area), placementPresetId: presetId, printAreaId: area?.id ?? "" });
  }

  function selectLocalTemplate(index: number, templateId: string) {
    const current = localSelections[index];
    const candidates = artworkPrintAreasFor(templateId);
    setLocalSelections((items) => {
      let placementIndex = 0;
      return items.map((item) => {
        if (item.compositionKey !== current.compositionKey) return item;
        const wantedPlacement = localPlacement(item, printAreas, placementPresets);
        const area = candidates.find((candidate) => candidate.placement === wantedPlacement)
          ?? candidates[placementIndex]
          ?? candidates[0];
        placementIndex += 1;
        const preset = placementPresets.find((candidate) => candidate.id === area?.defaultPresetId)
          ?? placementPresets.find((candidate) => candidate.placement === area?.placement)
          ?? placementPresets.find((candidate) => candidate.id === item.placementPresetId);
        return { ...item, ...localDefaultsFromPreset(preset, area), mockupTemplateId: templateId, printAreaId: area?.id ?? "", placementPresetId: preset?.id ?? "" };
      });
    });
  }

  function addLocalPlacement(index: number) {
    const source = localSelections[index];
    if (!source) return;
    const used = new Set(localSelections.filter((item) => item.compositionKey === source.compositionKey).map((item) => localPlacement(item, printAreas, placementPresets)));
    const area = artworkPrintAreasFor(source.mockupTemplateId).find((item) => !used.has(item.placement ?? item.mockupView?.placementCode ?? "FRONT"));
    if (!area) {
      toast({ tone: "info", title: "All uploaded placements are already added" });
      return;
    }
    const preset = placementPresets.find((item) => item.id === area.defaultPresetId)
      ?? localPresetsFor(source.localBaseProductId).find((item) => item.placement === area.placement);
    setLocalSelections((current) => [...current, {
      ...source,
      id: crypto.randomUUID(),
      printAreaId: area.id,
      placementPresetId: preset?.id ?? "",
      ...localDefaultsFromPreset(preset, area),
    }]);
  }

  function selectPrintArea(index: number, printAreaId: string) {
    const area = printAreas.find((item) => item.id === printAreaId);
    const preset = placementPresets.find((item) => item.id === area?.defaultPresetId)
      ?? placementPresets.find((item) => item.id === localSelections[index].placementPresetId);
    updateLocalSelection(index, { ...localDefaultsFromPreset(preset, area), printAreaId, placementPresetId: preset?.id ?? "" });
  }

  function updateGlobalSelection(index: number, patch: Partial<GlobalSelectionForm>) {
    setGlobalSelections((current) => current.map((selection, currentIndex) => currentIndex === index ? { ...selection, ...patch } : selection));
  }

  function invalidateGlobalPreview(index: number, patch: Partial<GlobalSelectionForm>) {
    const taskKey = globalSelections[index]?.previewTaskKey;
    if (taskKey) {
      previewControllersRef.current.get(taskKey)?.abort();
      previewControllersRef.current.delete(taskKey);
    }
    updateGlobalSelection(index, {
      ...patch,
      previewTaskKey: undefined,
      previewUrls: undefined,
      previewLoading: false,
    });
  }

  function removeGlobalSelection(index: number) {
    const taskKey = globalSelections[index]?.previewTaskKey;
    if (taskKey) {
      previewControllersRef.current.get(taskKey)?.abort();
      previewControllersRef.current.delete(taskKey);
    }
    setGlobalSelections((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function selectPrintfulTemplate(index: number, templateId: string) {
    const preset = globalPresetsFor(templateId)[0];
    const template = printfulTemplates.find((item) => item.id === templateId);
    const variantIds = variantIdsFromTemplate(template);
    invalidateGlobalPreview(index, {
      ...globalDefaultsFromPreset(preset),
      printfulProductTemplateId: templateId,
      placementPresetId: preset?.id ?? "",
      technique: defaultTechnique(template),
      selectedVariantIds: variantIds.slice(0, 1),
      previewUrls: undefined,
      previewTaskKey: undefined,
    });
  }

  function selectGlobalPreset(index: number, presetId: string) {
    const preset = placementPresets.find((item) => item.id === presetId);
    invalidateGlobalPreview(index, { ...globalDefaultsFromPreset(preset), placementPresetId: presetId });
  }

  function toggleVariant(index: number, variantId: string) {
    const taskKey = globalSelections[index]?.previewTaskKey;
    if (taskKey) {
      previewControllersRef.current.get(taskKey)?.abort();
      previewControllersRef.current.delete(taskKey);
    }
    setGlobalSelections((current) => current.map((selection, currentIndex) => {
      if (currentIndex !== index) return selection;
      const selectedVariantIds = selection.selectedVariantIds.includes(variantId)
        ? selection.selectedVariantIds.filter((item) => item !== variantId)
        : [...selection.selectedVariantIds, variantId];
      return {
        ...selection,
        selectedVariantIds: selectedVariantIds.length ? selectedVariantIds : [variantId],
        previewTaskKey: undefined,
        previewUrls: undefined,
        previewLoading: false,
      };
    }));
  }

  async function copyPlacementFromLocal(globalIndex: number, localIndex: number) {
    const local = localSelections[localIndex];
    const global = globalSelections[globalIndex];
    if (!local?.printAreaId || !global?.printfulProductTemplateId) return;
    const originalGlobalPosition = [global.widthIn, global.heightIn, global.leftIn, global.topIn, global.scale].join(":");
    setActionError("");
    invalidateGlobalPreview(globalIndex, { editorReady: false, preferContextInitialPlacement: false });
    try {
      const suggested = await api.post<{ widthIn: number; heightIn: number; leftIn: number; topIn: number; scale: number }>(
        `/admin/designs/${params.id}/suggest-printful-placement`,
        {
          printfulProductTemplateId: global.printfulProductTemplateId,
          placement: presetPlacement(global.placementPresetId),
          printAreaId: local.printAreaId,
          localBaseProductId: local.localBaseProductId,
          unit: local.unit,
          position: local.unit === "PX"
            ? { widthPx: numberValue(local.widthPx), heightPx: numberValue(local.heightPx), xPx: numberValue(local.xPx), yPx: numberValue(local.yPx), scale: numberValue(local.scale), rotation: numberValue(local.rotation) }
            : { widthCm: numberValue(local.widthCm), heightCm: numberValue(local.heightCm), xCm: numberValue(local.xCm), yCm: numberValue(local.yCm), scale: numberValue(local.scale), rotation: numberValue(local.rotation) },
        },
      );
      setGlobalSelections((current) => current.map((selection) =>
        selection.id === global.id
        && selection.printfulProductTemplateId === global.printfulProductTemplateId
        && selection.placementPresetId === global.placementPresetId
        && [selection.widthIn, selection.heightIn, selection.leftIn, selection.topIn, selection.scale].join(":") === originalGlobalPosition
          ? {
              ...selection,
              widthIn: String(suggested.widthIn),
              heightIn: String(suggested.heightIn),
              leftIn: String(suggested.leftIn),
              topIn: String(suggested.topIn),
              scale: String(suggested.scale ?? 1),
              editorReady: false,
              preferContextInitialPlacement: false,
            }
          : selection,
      ));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to copy placement");
    }
  }

  async function previewPrintfulMockup(index: number) {
    const selection = globalSelections[index];
    if (!selection?.printfulProductTemplateId) return;
    const requestKey = `request:${crypto.randomUUID()}`;
    const controller = new AbortController();
    previewControllersRef.current.set(requestKey, controller);
    setActionError("");
    updateGlobalSelection(index, { previewLoading: true, previewUrls: undefined, previewTaskKey: requestKey });
    try {
      const started = await api.post<{ taskKey: string; status: string }>(`/admin/designs/${params.id}/printful-mockup-preview`, {
        printfulProductTemplateId: selection.printfulProductTemplateId,
        placement: presetPlacement(selection.placementPresetId),
        technique: selection.technique,
        selectedVariantIds: selection.selectedVariantIds,
        position: {
          widthIn: numberValue(selection.widthIn),
          heightIn: numberValue(selection.heightIn),
          leftIn: numberValue(selection.leftIn),
          topIn: numberValue(selection.topIn),
          scale: numberValue(selection.scale),
        },
      });
      if (controller.signal.aborted) return;
      await pollPrintfulPreview(selection.id, started.taskKey, requestKey, controller.signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setGlobalSelections((current) => current.map((item) =>
        item.id === selection.id && item.previewTaskKey === requestKey
          ? { ...item, previewLoading: false, previewTaskKey: undefined }
          : item,
      ));
      setActionError(e instanceof Error ? e.message : "Printful preview failed");
    } finally {
      previewControllersRef.current.delete(requestKey);
    }
  }

  function applyPreparedPrintfulProduct(index: number, prepared: PreparedPrintfulProduct) {
    const template = { ...prepared.template, variantOptions: prepared.product.variants } as PrintfulTemplateOption;
    const presets = prepared.presets as PlacementPresetOption[];
    const preset = presets.find((item) => item.providerPlacement === template.defaultPlacement)
      ?? presets.find((item) => item.providerPlacement === "front")
      ?? presets[0];
    const variantIds = prepared.product.variants.filter((item) => item.inStock).map((item) => String(item.id));
    const compositionKey = globalSelections[index]?.compositionKey;
    const orderedPresets = preset ? [preset, ...presets.filter((item) => item.id !== preset.id)] : presets;

    setPrintfulTemplates((current) => [...current.filter((item) => item.id !== template.id), template]);
    setPlacementPresets((current) => [...current.filter((item) => !presets.some((presetItem) => presetItem.id === item.id)), ...presets]);
    setGlobalSelections((current) => {
      let placementIndex = 0;
      return current.map((selection) => {
        if (selection.compositionKey !== compositionKey) return selection;
        const placementPreset = orderedPresets[placementIndex] ?? orderedPresets[0];
        placementIndex += 1;
        return {
          ...selection,
          ...globalDefaultsFromPreset(placementPreset),
          printfulProductTemplateId: template.id,
          placementPresetId: placementPreset?.id ?? "",
          technique: defaultTechnique(template),
          selectedVariantIds: variantIds,
          previewTaskKey: undefined,
          previewUrls: undefined,
          previewLoading: false,
          editorReady: false,
          preferContextInitialPlacement: true,
        };
      });
    });
    toast({ tone: "success", title: "Printful product selected", description: "Printable areas and current in-stock variants are ready for placement." });
  }

  function addGlobalPlacement(index: number) {
    const source = globalSelections[index];
    if (!source) return;
    const used = new Set(globalSelections.filter((item) => item.compositionKey === source.compositionKey).map((item) => item.placementPresetId));
    const preset = globalPresetsFor(source.printfulProductTemplateId).find((item) => !used.has(item.id));
    if (!preset) {
      toast({ tone: "info", title: "All uploaded Printful placements are already added" });
      return;
    }
    setGlobalSelections((current) => [...current, {
      ...source,
      id: crypto.randomUUID(),
      placementPresetId: preset.id,
      previewTaskKey: undefined,
      previewUrls: undefined,
      previewLoading: false,
      ...globalDefaultsFromPreset(preset),
    }]);
  }

  async function pollPrintfulPreview(selectionId: string, taskKey: string, requestKey: string, signal: AbortSignal, attempt = 0) {
    if (attempt > 12) {
      setGlobalSelections((current) => current.map((selection) =>
        selection.id === selectionId && selection.previewTaskKey === requestKey
          ? { ...selection, previewLoading: false, previewTaskKey: undefined }
          : selection,
      ));
      setActionError("Printful preview timed out");
      return;
    }
    const result = await api.get<{ status: string; mockupUrls: string[] }>(`/admin/designs/printful/mockup-tasks/${taskKey}`, { signal });
    if ((result.status === "completed" || result.mockupUrls.length > 0) && result.mockupUrls.length) {
      setGlobalSelections((current) => current.map((selection) =>
        selection.id === selectionId && selection.previewTaskKey === requestKey
          ? { ...selection, previewLoading: false, previewTaskKey: undefined, previewUrls: result.mockupUrls }
          : selection,
      ));
      return;
    }
    if (result.status === "failed") {
      setGlobalSelections((current) => current.map((selection) =>
        selection.id === selectionId && selection.previewTaskKey === requestKey
          ? { ...selection, previewLoading: false, previewTaskKey: undefined }
          : selection,
      ));
      setActionError("Printful preview failed");
      return;
    }
    await abortableDelay(Math.min(5000, 1000 * (attempt + 1)), signal);
    await pollPrintfulPreview(selectionId, taskKey, requestKey, signal, attempt + 1);
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
      compositionKey: selection.compositionKey,
      localBaseProductId: selection.localBaseProductId,
      mockupTemplateId: selection.mockupTemplateId,
      printAreaId: selection.printAreaId,
      placementPresetId: selection.placementPresetId || undefined,
      placement: localPlacement(selection, printAreas, placementPresets),
      unit: selection.unit,
      anchor: selection.anchor,
      position: selection.unit === "PX"
        ? {
            widthPx: numberValue(selection.widthPx),
            heightPx: numberValue(selection.heightPx),
            xPx: numberValue(selection.xPx),
            yPx: numberValue(selection.yPx),
            scale: numberValue(selection.scale),
            rotation: numberValue(selection.rotation),
          }
        : {
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
      compositionKey: selection.compositionKey,
      printfulProductTemplateId: selection.printfulProductTemplateId,
      placementPresetId: selection.placementPresetId,
      placement: presetPlacement(selection.placementPresetId),
      technique: selection.technique,
      targetMarketplaces: selection.targetMarketplaces,
      selectedVariantIds: selection.selectedVariantIds,
      position: {
        widthIn: numberValue(selection.widthIn),
        heightIn: numberValue(selection.heightIn),
        leftIn: numberValue(selection.leftIn),
        topIn: numberValue(selection.topIn),
        scale: numberValue(selection.scale),
      },
    }));
  }

  function submitApproval(decisionOverride?: "APPROVE_LOCAL" | "APPROVE_GLOBAL") {
    const decision = decisionOverride ?? (pipelineMode === "global" ? "APPROVE_GLOBAL" : "APPROVE_LOCAL");
    if (decision === "APPROVE_GLOBAL" && (!localSelections.length || !globalSelections.length)) {
      setActionError("Global pipeline requires at least one local product and one Printful template.");
      return;
    }
    setPendingDecision(decision);
  }

  async function submitDecision(decision: "APPROVE_LOCAL" | "APPROVE_GLOBAL" | "REJECT") {
    setSubmitting(true);
    setActionError("");
    try {
      const payload = buildModerationDecisionPayload({
        decision,
        localSelections: toLocalPayload(),
        globalPrintfulSelections: toGlobalPayload(),
        rejectionReasons: selectedReasons,
        customRejectionReason: customReason,
        moderatorNotes: notes,
      });
      const next = await api.post<DesignWorkflowDetail>(`/admin/designs/${params.id}/moderation-decision`, payload);
      setDetail(next);
      if (decision === "REJECT") {
        toast({ tone: "success", title: "Design returned to designer", description: "The rejection reason was recorded in the audit log." });
        setWorkflowStep(1);
      } else {
        const failedMockupQueue = next.productSelections?.some((selection) => selection.status === "MOCKUP_FAILED");
        toast(failedMockupQueue
          ? { tone: "info", title: "Design approved", description: "One or more mockup jobs could not be queued. Use Retry in workflow history." }
          : { tone: "success", title: "Design approved", description: "Mockup generation has started." });
        setWorkflowStep(3);
      }
    } catch (e) {
      const nextError = e instanceof Error ? e.message : "Failed to submit moderation decision";
      const refreshed = await load({ background: true });
      const expectedStatus = decision === "REJECT"
        ? "REJECTED"
        : decision === "APPROVE_GLOBAL"
          ? "APPROVED_GLOBAL"
          : "APPROVED_LOCAL";
      if (refreshed?.status === expectedStatus) {
        setActionError("");
        setWorkflowStep(decision === "REJECT" ? 1 : 3);
        toast({
          tone: "info",
          title: decision === "REJECT" ? "Design rejection confirmed" : "Design approval confirmed",
          description: "The response was interrupted, but the saved moderation state was verified.",
        });
      } else {
        setActionError(nextError);
        toast({ tone: "error", title: "Moderation action failed", description: nextError });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function retryMockup(selectionId: string) {
    setSubmitting(true);
    setActionError("");
    try {
      await api.post(`/admin/design-product-selections/${selectionId}/retry-mockup`);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to retry mockup generation");
    } finally {
      setSubmitting(false);
    }
  }

  const latest = detail?.versions?.[0];

  const localReady = useMemo(
    () => localSelections.every((selection) =>
      selection.localBaseProductId
      && selection.mockupTemplateId
      && selection.printAreaId
      && selection.editorReady
      && placementArtworkAvailable(detail?.versions, localPlacement(selection, printAreas, placementPresets))),
    [detail?.versions, localSelections, placementPresets, printAreas],
  );

  const globalReady = useMemo(
    () => globalSelections.every((selection) =>
      selection.printfulProductTemplateId
      && selection.placementPresetId
      && selection.selectedVariantIds.length
      && selection.editorReady
      && placementArtworkAvailable(detail?.versions, placementPresets.find((item) => item.id === selection.placementPresetId)?.placement ?? "FRONT")),
    [detail?.versions, globalSelections, placementPresets],
  );

  const productRightsOk = Boolean(detail?.commercialRights?.allowProductSales);
  const marketplaceRightsOk = Boolean(detail?.commercialRights?.allowMarketplacePublishing);

  useEffect(() => {
    const target = pendingScrollTargetRef.current;
    if (!target) return;
    pendingScrollTargetRef.current = null;
    window.requestAnimationFrame(() => scrollToElement(target));
  }, [workflowStep]);

  function openWorkflowSection(step: WorkflowStep, target: string) {
    if (workflowStep === step) {
      scrollToElement(target);
      return;
    }
    pendingScrollTargetRef.current = target;
    setWorkflowStep(step);
  }

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard/moderator/designs">
            <Button variant="ghost"><ArrowLeft size={18} /> Back to queue</Button>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {detail?.previewImageUrl ? <a href={detail.previewImageUrl} target="_blank" rel="noopener noreferrer"><Button variant="secondary" size="sm">Download file</Button></a> : null}
            {detail && canModerate ? <Button variant="secondary" size="sm" onClick={() => openWorkflowSection(1, "moderation-rejection")}>Internal notes</Button> : null}
            {detail && canModerate ? <Button variant="danger" size="sm" onClick={() => openWorkflowSection(1, "moderation-rejection")}>Reject design</Button> : null}
            {detail && canModerate ? <Button variant="primaryPeach" size="sm" onClick={() => openWorkflowSection(2, "pipeline-approval")}>Approve</Button> : null}
            {detail ? <StatusBadge status={detail.status} /> : null}
          </div>
        </div>

        {loadError ? <ErrorState title="Moderation issue" description={loadError} retry={<Button onClick={() => void load()}>Retry</Button>} /> : null}
        {actionError ? <ErrorState title="Action failed" description={actionError} retry={<Button onClick={() => setActionError("")}>Dismiss</Button>} /> : null}
        {detail ? (
          <ModerationWorkflowStepper
            step={workflowStep}
            canConfigure={canModerate}
            hasSelections={Boolean(detail.productSelections?.length)}
            hasListings={Boolean(detail.listings?.length)}
            onChange={setWorkflowStep}
          />
        ) : null}

        {loading ? (
          <div aria-label="Loading design" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-[520px]" />
            <Skeleton className="h-[360px]" />
          </div>
        ) : loadNotFound ? (
          <EmptyState title="Design not found" description="This moderation item is no longer available." />
        ) : !detail ? null : (
          <div className="grid gap-6">
            {configError ? (
              <Card className="xl:col-span-2 border-status-warning/30 bg-status-warning/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-ink">Pipeline configuration unavailable</p>
                    <p className="mt-1 text-sm text-brand-muted">{configError}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadConfig} disabled={configLoading}>Retry</Button>
                </div>
              </Card>
            ) : null}
            <div className="space-y-6">
              {workflowStep === 1 ? (
              <>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
              <DesignPreviewCard
                title="Design artwork"
                src={detail.previewImageUrl}
                alt={detail.title}
                widthPx={latest?.widthPx}
                heightPx={latest?.heightPx}
              />

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
              </div>

              <ModeratorDesignStoryReview designId={String(params.id)} designStatus={detail.status} />
              </>
              ) : null}

              {workflowStep === 2 && canModerate ? (
              <Card id="pipeline-approval" className="scroll-mt-24">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-brand-ink">Pipeline Approval</h2>
                    <p className="mt-1 text-sm text-brand-muted">{configLoading ? "Loading product configuration..." : `${activeBaseProducts.length} local products, ${activePrintfulTemplates.length} Printful templates`}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadConfig} disabled={configLoading}>Refresh</Button>
                </div>

                {!productRightsOk || (pipelineMode === "global" && !marketplaceRightsOk) ? (
                  <div role="alert" className="mb-5 rounded-2xl border border-status-warning/30 bg-status-warning/5 p-4 text-sm">
                    <p className="font-semibold text-brand-ink">Designer rights are not ready</p>
                    <p className="mt-1 text-brand-muted">The designer must allow product sales{pipelineMode === "global" ? " and marketplace publishing" : ""} before this design can be approved for this pipeline.</p>
                  </div>
                ) : null}

                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPipelineMode("uzbek")}
                    className={`rounded-2xl border p-4 text-left transition ${pipelineMode === "uzbek" ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/20" : "border-surface-borderSoft bg-white"}`}
                  >
                    <div className="flex items-center gap-2 text-brand-blue">
                      <MapPin size={18} />
                      <span className="font-semibold text-brand-ink">Uzbek pipeline</span>
                    </div>
                    <p className="mt-2 text-sm text-brand-muted">Local production with RashPOD base products and mockup templates.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineMode("global")}
                    className={`rounded-2xl border p-4 text-left transition ${pipelineMode === "global" ? "border-brand-peach bg-brand-peach/10 ring-2 ring-brand-peach/30" : "border-surface-borderSoft bg-white"}`}
                  >
                    <div className="flex items-center gap-2 text-brand-peach">
                      <Globe2 size={18} />
                      <span className="font-semibold text-brand-ink">Global pipeline</span>
                    </div>
                    <p className="mt-2 text-sm text-brand-muted">Uzbek local products plus Printful pathway for global marketplaces.</p>
                  </button>
                </div>

                <div className="grid items-start gap-5 2xl:grid-cols-2">
                  <DecisionSection icon={<MapPin size={20} />} title={pipelineMode === "global" ? "Uzbek Base Products" : "Select Base Products"}>
                    <div className="space-y-4">
                      {localSelections.map((selection, index) => (
                        <SelectionPanel key={selection.id} title={compositionPlacementTitle(localSelections, index, "Local product")} onRemove={localSelections.length > 1 ? () => setLocalSelections((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}>
                          <div>
                            <p className="mb-2 text-sm font-medium text-brand-ink">Base product</p>
                            <ProductPickerGrid
                              items={activeBaseProducts.map((item) => ({
                                id: item.id,
                                name: item.name,
                                imageUrl: item.imageUrl,
                                subtitle: item.productType?.name ?? undefined,
                                badge: item.productType?.name ?? "Local",
                              }))}
                              selectedId={selection.localBaseProductId}
                              onSelect={(value) => selectLocalProduct(index, value)}
                              emptyLabel="No active base products configured."
                            />
                          </div>
                          <div className="mt-4">
                            <p className="mb-2 text-sm font-medium text-brand-ink">Placement area</p>
                            <PlacementChips
                              presets={localPresetsFor(selection.localBaseProductId)}
                              selectedId={selection.placementPresetId}
                              onSelect={(presetId) => selectLocalPlacementChip(index, presetId)}
                            />
                          </div>
                          <PlacementArtworkNotice
                            placement={localPlacement(selection, printAreas, placementPresets)}
                            versions={detail.versions}
                          />
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <SelectField label="Placement preset (optional)" value={selection.placementPresetId} onChange={(value) => selectLocalPreset(index, value)} options={localPresetsFor(selection.localBaseProductId).map((item) => ({ value: item.id, label: `${item.name} - ${item.placement}` }))} />
                            <SelectField label="Mockup template" value={selection.mockupTemplateId} onChange={(value) => selectLocalTemplate(index, value)} options={localTemplatesFor(selection.localBaseProductId).map((item) => ({ value: item.id, label: item.name }))} />
                            <SelectField
                              label="Product view / print area"
                              value={selection.printAreaId}
                              onChange={(value) => selectPrintArea(index, value)}
                              options={artworkPrintAreasFor(selection.mockupTemplateId).map((item) => ({
                                value: item.id,
                                label: `${item.mockupView?.name ?? "Legacy primary view"} · ${item.name} · safe ${item.safeWidth}x${item.safeHeight}px`,
                              }))}
                            />
                          </div>
                          <div className="mt-4">
                            <ReadinessChecklist
                              items={[
                                { label: "Base product selected", ok: Boolean(selection.localBaseProductId) },
                                { label: "Mockup template selected", ok: Boolean(selection.mockupTemplateId) },
                                { label: "Print area configured", ok: Boolean(selection.printAreaId) },
                                { label: selection.placementPresetId ? "Placement preset applied" : "Using print-area default placement", ok: true },
                                { label: "Visual placement validated", ok: selection.editorReady },
                              ]}
                            />
                          </div>
                          {selection.localBaseProductId && selection.mockupTemplateId && selection.printAreaId && params.id ? (
                            <div className="mt-4">
                              <p className="mb-2 text-sm font-medium text-brand-ink">Visual placement</p>
                              {placementArtworkAvailable(detail.versions, localPlacement(selection, printAreas, placementPresets)) ? <LocalSelectionMockupEditor
                                designId={String(params.id)}
                                selection={{
                                  localBaseProductId: selection.localBaseProductId,
                                  mockupTemplateId: selection.mockupTemplateId,
                                  printAreaId: selection.printAreaId,
                                  placementPresetId: selection.placementPresetId,
                                  preferContextInitialPlacement: selection.preferContextInitialPlacement,
                                  unit: selection.unit,
                                  widthPx: numberValue(selection.widthPx),
                                  heightPx: numberValue(selection.heightPx),
                                  xPx: numberValue(selection.xPx),
                                  yPx: numberValue(selection.yPx),
                                  widthCm: numberValue(selection.widthCm),
                                  heightCm: numberValue(selection.heightCm),
                                  xCm: numberValue(selection.xCm),
                                  yCm: numberValue(selection.yCm),
                                  scale: numberValue(selection.scale),
                                  rotation: numberValue(selection.rotation),
                                }}
                                onPlacementChange={(payload) =>
                                  updateLocalSelection(index, {
                                    widthPx: String(payload.widthPx),
                                    heightPx: String(payload.heightPx),
                                    xPx: String(payload.xPx),
                                    yPx: String(payload.yPx),
                                    widthCm: String(payload.widthCm),
                                    heightCm: String(payload.heightCm),
                                    xCm: String(payload.xCm),
                                    yCm: String(payload.yCm),
                                    scale: String(payload.scale),
                                    rotation: String(payload.rotation),
                                    editorReady: true,
                                    preferContextInitialPlacement: false,
                                  })
                                }
                              /> : <MissingPlacementArtworkState placement={localPlacement(selection, printAreas, placementPresets)} />}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue"
                            onClick={() => setExpandedLocal((current) => ({ ...current, [selection.id]: !current[selection.id] }))}
                          >
                            {expandedLocal[selection.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            Numeric placement debug
                          </button>
                          {expandedLocal[selection.id] ? (
                            <>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <SelectField
                                  label="Unit"
                                  value={selection.unit}
                                  onChange={(value) => updateLocalSelection(index, { unit: value as LocalSelectionForm["unit"], editorReady: false, preferContextInitialPlacement: false })}
                                  options={[
                                    ...(printAreas.find((item) => item.id === selection.printAreaId)?.widthCm
                                      && printAreas.find((item) => item.id === selection.printAreaId)?.heightCm
                                      ? [{ value: "CM", label: "Centimeters" }]
                                      : []),
                                    { value: "PX", label: "Pixels" },
                                  ]}
                                />
                                <SelectField label="Anchor" value={selection.anchor} onChange={(value) => updateLocalSelection(index, { anchor: value as LocalSelectionForm["anchor"], editorReady: false, preferContextInitialPlacement: false })} options={[{ value: "TOP_LEFT", label: "Top left" }, { value: "CENTER", label: "Center" }]} />
                                <NumberField label="Scale" value={selection.scale} onChange={(value) => updateLocalSelection(index, { scale: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowResize === false} />
                                <NumberField label="Rotation" value={selection.rotation} onChange={(value) => updateLocalSelection(index, { rotation: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowRotate === false} />
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <NumberField label="X px" value={selection.xPx} onChange={(value) => updateLocalSelection(index, { xPx: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowMove === false} />
                                <NumberField label="Y px" value={selection.yPx} onChange={(value) => updateLocalSelection(index, { yPx: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowMove === false} />
                                <NumberField label="Width px" value={selection.widthPx} onChange={(value) => updateLocalSelection(index, { widthPx: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowResize === false} />
                                <NumberField label="Height px" value={selection.heightPx} onChange={(value) => updateLocalSelection(index, { heightPx: value, editorReady: false, preferContextInitialPlacement: false })} disabled={printAreas.find((item) => item.id === selection.printAreaId)?.allowResize === false} />
                              </div>
                              {!selection.editorReady ? <p className="mt-2 text-xs text-status-warning">Use the visual placement controls once to validate numeric changes.</p> : null}
                            </>
                          ) : null}
                          {selection.printAreaId ? <p className="mt-3 text-xs text-brand-muted">{printAreaSummary(printAreas.find((item) => item.id === selection.printAreaId))}</p> : <p className="mt-3 text-xs text-status-danger">Select an active print area before approval.</p>}
                          <div className="mt-4 border-t border-surface-borderSoft pt-4">
                            <Button variant="secondary" size="sm" onClick={() => addLocalPlacement(index)}>
                              <Plus size={16} /> Add placement to this product
                            </Button>
                          </div>
                        </SelectionPanel>
                      ))}
                      <Button variant="secondary" size="sm" onClick={() => setLocalSelections((current) => [...current, createLocalSelection(baseProducts, placementPresets, mockupTemplates, printAreas, detail?.versions)])} disabled={configLoading}>
                        <Plus size={16} /> Add Local Product
                      </Button>
                      <Button
                        onClick={() => submitApproval("APPROVE_LOCAL")}
                        disabled={submitting || configLoading || !productRightsOk || !localSelections.length || !localReady}
                        loading={submitting && pendingDecision === "APPROVE_LOCAL"}
                      >
                        <MapPin size={18} /> Approve Local & Generate Mockups
                      </Button>
                    </div>
                  </DecisionSection>

                  <DecisionSection icon={<Globe2 size={20} />} title="Printful Products">
                    <div className="space-y-4">
                      {globalSelections.map((selection, index) => (
                        <SelectionPanel key={selection.id} title={compositionPlacementTitle(globalSelections, index, "Printful product")} onRemove={globalSelections.length > 1 ? () => removeGlobalSelection(index) : undefined}>
                          <div>
                            <PrintfulModerationCatalog
                              selectedCatalogProductId={printfulTemplates.find((item) => item.id === selection.printfulProductTemplateId)?.printfulCatalogProductId}
                              onPrepared={(prepared) => applyPreparedPrintfulProduct(index, prepared)}
                            />
                            {selection.printfulProductTemplateId ? (
                              <div className="mt-4 rounded-2xl border border-brand-blue/30 bg-brand-lightBlue/20 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Selected for moderation</p>
                                <p className="mt-1 font-semibold text-brand-ink">{printfulTemplates.find((item) => item.id === selection.printfulProductTemplateId)?.displayName ?? "Printful product"}</p>
                                <p className="mt-1 text-xs text-brand-muted">The product, variants, technique, and placement approved here will be locked for publishing.</p>
                              </div>
                            ) : null}
                          </div>
                          {selection.printfulProductTemplateId ? (
                            <>
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium text-brand-ink">Placement area</p>
                                <PlacementChips
                                  presets={globalPresetsFor(selection.printfulProductTemplateId)}
                                  selectedId={selection.placementPresetId}
                                  onSelect={(presetId) => selectGlobalPreset(index, presetId)}
                                />
                              </div>
                              <PlacementArtworkNotice
                                placement={placementPresets.find((item) => item.id === selection.placementPresetId)?.placement ?? "FRONT"}
                                versions={detail.versions}
                              />
                              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                <SelectField label="Printful placement" value={selection.placementPresetId} onChange={(value) => selectGlobalPreset(index, value)} options={globalPresetsFor(selection.printfulProductTemplateId).map((item) => ({ value: item.id, label: `${item.name} - ${item.providerPlacement ?? item.placement}` }))} />
                                <SelectField label="Technique" value={selection.technique} onChange={(value) => invalidateGlobalPreview(index, { technique: value })} options={techniqueOptionsFor(selection.printfulProductTemplateId, printfulTemplates)} />
                              </div>
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium text-brand-ink">Variants for mockup</p>
                                <div className="flex flex-wrap gap-2">
                                  {variantIdsFromTemplate(printfulTemplates.find((item) => item.id === selection.printfulProductTemplateId)).map((variantId) => (
                                    <label key={variantId} className="flex min-h-10 items-center gap-2 rounded-pill border border-surface-borderSoft px-3 text-xs text-brand-ink">
                                      <input type="checkbox" checked={selection.selectedVariantIds.includes(variantId)} onChange={() => toggleVariant(index, variantId)} />
                                      <span>{variantLabel(printfulTemplates.find((item) => item.id === selection.printfulProductTemplateId), variantId)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {localSelections.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {localSelections.map((local, localIndex) => (
                                    <Button key={local.id} size="sm" variant="secondary" onClick={() => copyPlacementFromLocal(index, localIndex)}>
                                      Copy placement from local {localIndex + 1}
                                    </Button>
                                  ))}
                                </div>
                              ) : null}
                              {selection.printfulProductTemplateId && selection.placementPresetId && params.id ? (
                                <div className="mt-4">
                                  <p className="mb-2 text-sm font-medium text-brand-ink">Visual placement</p>
                                  {placementArtworkAvailable(detail.versions, placementPresets.find((item) => item.id === selection.placementPresetId)?.placement ?? "FRONT") ? <GlobalSelectionMockupEditor
                                    designId={String(params.id)}
                                    selection={{
                                      printfulProductTemplateId: selection.printfulProductTemplateId,
                                      placementPresetId: selection.placementPresetId,
                                      placement: presetPlacement(selection.placementPresetId),
                                      preferContextInitialPlacement: selection.preferContextInitialPlacement,
                                      widthIn: numberValue(selection.widthIn),
                                      heightIn: numberValue(selection.heightIn),
                                      leftIn: numberValue(selection.leftIn),
                                      topIn: numberValue(selection.topIn),
                                      scale: numberValue(selection.scale),
                                    }}
                                    onPlacementChange={(payload) =>
                                      invalidateGlobalPreview(index, {
                                        widthIn: String(payload.widthIn),
                                        heightIn: String(payload.heightIn),
                                        leftIn: String(payload.leftIn),
                                        topIn: String(payload.topIn),
                                        scale: String(payload.scale),
                                        editorReady: true,
                                        preferContextInitialPlacement: false,
                                      })
                                    }
                                  /> : <MissingPlacementArtworkState placement={placementPresets.find((item) => item.id === selection.placementPresetId)?.placement ?? "FRONT"} />}
                                </div>
                              ) : null}
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" variant="secondary" onClick={() => previewPrintfulMockup(index)} disabled={selection.previewLoading || submitting || !selection.editorReady} loading={selection.previewLoading}>
                                  Preview Printful mockup
                                </Button>
                              </div>
                              {selection.previewUrls?.length ? (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  {selection.previewUrls.map((url) => (
                                    <div key={url} className="overflow-hidden rounded-xl border border-surface-borderSoft bg-white">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt="Printful preview" className="h-full w-full object-contain" />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              <button
                                type="button"
                                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue"
                                onClick={() => setExpandedGlobalNumeric((current) => ({ ...current, [selection.id]: !current[selection.id] }))}
                              >
                                {expandedGlobalNumeric[selection.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                Numeric placement debug
                              </button>
                              {expandedGlobalNumeric[selection.id] ? (
                                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                  <NumberField label="Width in" value={selection.widthIn} onChange={(value) => invalidateGlobalPreview(index, { widthIn: value, editorReady: false, preferContextInitialPlacement: false })} />
                                  <NumberField label="Height in" value={selection.heightIn} onChange={(value) => invalidateGlobalPreview(index, { heightIn: value, editorReady: false, preferContextInitialPlacement: false })} />
                                  <NumberField label="Left in" value={selection.leftIn} onChange={(value) => invalidateGlobalPreview(index, { leftIn: value, editorReady: false, preferContextInitialPlacement: false })} />
                                  <NumberField label="Top in" value={selection.topIn} onChange={(value) => invalidateGlobalPreview(index, { topIn: value, editorReady: false, preferContextInitialPlacement: false })} />
                                  <NumberField label="Scale" value={selection.scale} onChange={(value) => invalidateGlobalPreview(index, { scale: value, editorReady: false, preferContextInitialPlacement: false })} />
                                </div>
                              ) : null}
                              <div className="mt-4 border-t border-surface-borderSoft pt-4">
                                <Button variant="secondary" size="sm" onClick={() => addGlobalPlacement(index)}>
                                  <Plus size={16} /> Add placement to this product
                                </Button>
                              </div>
                              {!selection.editorReady ? <p className="mt-2 text-xs text-status-warning">Use the visual placement controls once to validate numeric changes.</p> : null}
                            </>
                          ) : null}
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
                      <Button variant="secondary" size="sm" onClick={() => setGlobalSelections((current) => [...current, createGlobalSelection(printfulTemplates, placementPresets, detail?.versions)])} disabled={configLoading}>
                        <Plus size={16} /> Add Printful Product
                      </Button>
                      <Button
                        onClick={() => submitApproval("APPROVE_GLOBAL")}
                        disabled={submitting || configLoading || !productRightsOk || !marketplaceRightsOk || !localSelections.length || !localReady || !globalSelections.length || !globalReady}
                        loading={submitting && pendingDecision === "APPROVE_GLOBAL"}
                      >
                        <Globe2 size={18} /> Approve Global & Generate Mockups
                      </Button>
                    </div>
                  </DecisionSection>
                </div>

                <div className="mt-5 space-y-3">
                  <ReadinessChecklist
                    items={[
                      { label: "Local product selections ready", ok: localReady },
                      { label: pipelineMode === "global" ? "Printful selections ready" : "Printful not required (Uzbek only)", ok: pipelineMode === "uzbek" || globalReady },
                      { label: "Product sales rights granted", ok: productRightsOk },
                      { label: pipelineMode === "global" ? "Marketplace publishing rights granted" : "Marketplace rights not required", ok: pipelineMode === "uzbek" || marketplaceRightsOk },
                    ]}
                  />
                </div>
              </Card>
              ) : null}

              {workflowStep === 1 ? (
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
              ) : null}

              {workflowStep === 3 ? (
              <Card ref={mockupSectionRef} className={highlightMockups ? "ring-2 ring-brand-blue/40" : undefined}>
                <h2 className="mb-4 text-xl font-semibold text-brand-ink">Mockup & Listing Pipeline</h2>
                {mockupPending ? (
                  <p className="mb-4 flex items-center gap-2 text-sm text-brand-muted"><Loader2 size={16} className="animate-spin" /> Generating mockups...</p>
                ) : null}
                {detail.productSelections?.length ? (
                  <div className="space-y-4">
                    {detail.productSelections.map((selection) => {
                      const failedAsset = selection.mockupAssets?.find((asset) => asset.status === "FAILED");
                      const retryable = isMockupRetryable(selection.errorMessage, failedAsset?.metadataJson);
                      const configurationFailure = isMockupConfigurationFailure(selection.errorMessage);
                      const sourceVersion = detail.versions?.find((version) => version.id === selection.sourceDesignVersionId);
                      const artworkLabel = sourceVersion?.placement
                        ? `Dedicated ${formatPlacementLabel(sourceVersion.placement)} artwork`
                        : "Default artwork fallback";
                      return (
                      <div key={selection.id} className="rounded-xl border border-surface-borderSoft p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-ink">{selection.pipeline} · {selection.placement}</p>
                            <p className="mt-1 text-xs font-medium text-brand-muted">Artwork: {artworkLabel}</p>
                            {selection.errorMessage ? (
                              <>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-status-danger">{selection.errorMessage}</p>
                                <MockupErrorHint code={selection.errorMessage} details={failedAsset?.metadataJson} />
                              </>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={selection.status} />
                            {selection.status === "MOCKUP_FAILED" && retryable ? <Button size="sm" variant="secondary" onClick={() => retryMockup(selection.id)} disabled={submitting}>Retry</Button> : null}
                            {selection.status === "MOCKUP_FAILED" && !retryable && configurationFailure && canModerate ? <Button size="sm" variant="secondary" onClick={() => openWorkflowSection(2, "pipeline-approval")}>Review setup</Button> : null}
                          </div>
                        </div>
                        {selection.mockupAssets?.length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {selection.mockupAssets.map((asset) => (
                              <div key={asset.id} className="overflow-hidden rounded-xl border border-surface-borderSoft bg-white">
                                <div className="aspect-square flex items-center justify-center bg-brand-bg">
                                  {asset.imageUrl || asset.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={asset.imageUrl ?? asset.thumbnailUrl ?? ""} alt={asset.mockupType} className="h-full w-full object-contain" />
                                  ) : (
                                    <p className="px-3 text-center text-xs text-brand-muted">{asset.status}</p>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 p-2">
                                  <p className="text-sm font-semibold text-brand-ink">{asset.mockupType}</p>
                                  <StatusBadge status={asset.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="mt-3 text-sm text-brand-muted">No mockup assets have been created for this selection yet.</p>}
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-brand-muted">No product selections have been approved yet.</p>
                )}
                <div className="mt-5 flex justify-end">
                  <Button
                    onClick={() => setWorkflowStep(4)}
                    disabled={!detail.listings?.length}
                  >
                    {detail.listings?.some((listing) => listing.status === "DRAFT") ? "Continue to listings" : "View listing status"}
                  </Button>
                </div>
              </Card>
              ) : null}

              {workflowStep === 4 ? (
                <>
                  {(detail.listings ?? []).filter((listing) => listing.status === "DRAFT").map((listing) => {
                    const selection = detail.productSelections?.find((item) => item.id === listing.designProductSelectionId);
                    return (
                      <ModeratorListingWizard
                        key={listing.id}
                        listing={{
                          ...listing,
                          designProductSelection: selection
                            ? {
                                id: selection.id,
                                pipeline: selection.pipeline,
                                placement: selection.placement,
                                providerPlacement: selection.providerPlacement,
                                technique: selection.technique,
                                placementConfigJson: selection.placementConfigJson,
                                mockupAssets: selection.mockupAssets,
                                localBaseProduct: selection.localBaseProduct as {
                                  name?: string;
                                  availableColors?: unknown;
                                  availableSizes?: unknown;
                                  defaultPrice?: string | number | null;
                                  currency?: string;
                                } | null,
                                printfulProductTemplate: selection.printfulProductTemplate as {
                                  printfulCatalogProductId?: string | null;
                                  displayName?: string;
                                  defaultRetailPrice?: string | number | null;
                                  currency?: string;
                                  allowedColorVariantIds?: unknown;
                                  allowedSizeVariantIds?: unknown;
                                } | null,
                              }
                            : null,
                        }}
                        designTitle={detail.title}
                        onSaved={load}
                      />
                    );
                  })}
                  {!detail.listings?.some((listing) => listing.status === "DRAFT") ? (
                    <Card>
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-semantic-successBg text-semantic-successText">
                          <CheckCircle2 size={22} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-semibold text-brand-ink">Listing workflow complete</h2>
                          <p className="mt-1 text-sm text-brand-muted">
                            There are no remaining draft listings. Published and reviewed listings remain available below.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3">
                        {(detail.listings ?? []).map((listing) => (
                          <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-line bg-surface-card px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-brand-ink">{listing.title}</p>
                              <p className="mt-0.5 text-sm text-brand-muted">{listing.slug}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <StatusBadge status={listing.status} />
                              <Link href={`/dashboard/moderator/listings/${listing.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-blue underline decoration-brand-blue/30 underline-offset-4">
                                Open listing
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </>
              ) : null}
            </div>

            {workflowStep === 1 && canModerate ? (
            <Card id="moderation-rejection" className="scroll-mt-24 border-semantic-danger/20">
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
                className="mt-2 min-h-24 w-full rounded-xl border border-surface-borderSoft bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20"
              />
              <label className="mt-4 block text-sm font-medium text-brand-ink" htmlFor="notes">Internal notes</label>
              <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional moderator note" className="mt-2" />
              <Button className="mt-5 w-full" variant="danger" onClick={() => setPendingDecision("REJECT")} disabled={submitting || (!selectedReasons.length && !customReason.trim())} loading={submitting && pendingDecision === "REJECT"}>
                <XCircle size={18} /> Submit Rejection
              </Button>
            </Card>
            ) : null}
          </div>
        )}
      </div>
      <ConfirmationDialog
        open={pendingDecision !== null}
        title={pendingDecision === "REJECT" ? "Reject this design?" : "Approve and generate mockups?"}
        description={pendingDecision === "REJECT" ? "The designer will receive the selected rejection reasons. This action is recorded in the moderation audit." : `This will approve the ${pendingDecision === "APPROVE_GLOBAL" ? "local and global" : "local"} pipeline and start mockup generation.`}
        confirmLabel={pendingDecision === "REJECT" ? "Reject design" : "Approve & generate"}
        destructive={pendingDecision === "REJECT"}
        busy={submitting}
        onCancel={() => setPendingDecision(null)}
        onConfirm={async () => {
          if (!pendingDecision) return;
          const decision = pendingDecision;
          await submitDecision(decision);
          setPendingDecision(null);
        }}
      />
    </DashboardLayout>
  );
}

function ModerationWorkflowStepper({
  step,
  canConfigure,
  hasSelections,
  hasListings,
  onChange,
}: {
  step: WorkflowStep;
  canConfigure: boolean;
  hasSelections: boolean;
  hasListings: boolean;
  onChange: (step: WorkflowStep) => void;
}) {
  const steps: Array<{ id: WorkflowStep; label: string; description: string; icon: ReactNode; enabled: boolean }> = [
    { id: 1, label: "Review", description: "Design and story", icon: <ClipboardCheck size={18} />, enabled: true },
    { id: 2, label: "Placement", description: "Products and safe zones", icon: <MapPin size={18} />, enabled: canConfigure },
    { id: 3, label: "Mockups", description: "Generated image set", icon: <ImageIcon size={18} />, enabled: hasSelections },
    { id: 4, label: "Listing", description: "Copy, variants and publish", icon: <FileText size={18} />, enabled: hasListings },
  ];

  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Create mockup & listing</p>
        <h2 className="mt-1 text-xl font-semibold text-brand-ink">Four-step moderation workflow</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Mockup and listing workflow">
        {steps.map((item) => {
          const current = item.id === step;
          const complete = item.id < step && item.enabled;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => item.enabled && onChange(item.id)}
                disabled={!item.enabled}
                aria-current={current ? "step" : undefined}
                className={`flex min-h-[76px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 ${
                  current
                    ? "border-brand-blue bg-brand-blue/5"
                    : complete
                      ? "border-semantic-success/25 bg-semantic-successBg"
                      : "border-surface-borderSoft bg-white disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${current ? "bg-brand-blue text-white" : complete ? "bg-semantic-success text-white" : "bg-surface-card text-brand-muted"}`}>
                  {complete ? <CheckCircle2 size={18} aria-hidden="true" /> : item.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-ink">{item.id}. {item.label}</span>
                  <span className="mt-0.5 block text-xs text-brand-muted">{item.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function createLocalSelection(products: BaseProductOption[], presets: PlacementPresetOption[], templates: MockupTemplateOption[], areas: PrintAreaOption[], versions?: Array<{ placement?: string | null }>): LocalSelectionForm {
  const activeProducts = products.filter((item) => item.isActive !== false);
  const activeTemplates = templates.filter((item) => item.isActive !== false);
  const matchingArea = areas.find((item) => item.isActive !== false
    && item.mockupView?.isActive !== false
    && placementArtworkAvailable(versions, item.placement ?? item.mockupView?.placementCode ?? "FRONT")
    && activeTemplates.some((template) => template.id === item.mockupTemplateId && activeProducts.some((product) => product.id === template.baseProductId)));
  const template = activeTemplates.find((item) => item.id === matchingArea?.mockupTemplateId)
    ?? activeTemplates.find((item) => activeProducts.some((product) => product.id === item.baseProductId));
  const product = activeProducts.find((item) => item.id === template?.baseProductId) ?? activeProducts[0];
  const configuredAreas = areas.filter((item) => item.isActive !== false && item.mockupView?.isActive !== false && item.mockupTemplateId === template?.id);
  const area = configuredAreas.find((item) => item.id === matchingArea?.id)
    ?? configuredAreas.find((item) => placementArtworkAvailable(versions, item.placement ?? item.mockupView?.placementCode ?? "FRONT"))
    ?? configuredAreas[0];
  const preset = presets.find((item) => item.id === area?.defaultPresetId && item.active !== false)
    ?? presets.find((item) => item.active !== false && item.pipeline === "LOCAL" && (!item.localBaseProductId || item.localBaseProductId === product?.id));
  return { id: crypto.randomUUID(), compositionKey: crypto.randomUUID(), localBaseProductId: product?.id ?? "", mockupTemplateId: template?.id ?? "", printAreaId: area?.id ?? "", placementPresetId: preset?.id ?? "", ...localDefaultsFromPreset(preset, area) };
}

function createGlobalSelection(templates: PrintfulTemplateOption[], presets: PlacementPresetOption[], versions?: Array<{ placement?: string | null }>): GlobalSelectionForm {
  const activeTemplates = templates.filter((item) => item.active !== false);
  const matchingPreset = presets.find((item) => item.active !== false
    && item.pipeline === "GLOBAL_PRINTFUL"
    && placementArtworkAvailable(versions, item.providerPlacement ?? item.placement)
    && (!item.productTemplateId || activeTemplates.some((template) => template.id === item.productTemplateId)));
  const template = activeTemplates.find((item) => item.id === matchingPreset?.productTemplateId) ?? activeTemplates[0];
  const availablePresets = presets.filter((item) => item.active !== false && item.pipeline === "GLOBAL_PRINTFUL" && (!item.productTemplateId || item.productTemplateId === template?.id));
  const preset = availablePresets.find((item) => item.id === matchingPreset?.id)
    ?? availablePresets.find((item) => placementArtworkAvailable(versions, item.providerPlacement ?? item.placement))
    ?? availablePresets[0];
  const variantIds = variantIdsFromTemplate(template);
  return {
    id: crypto.randomUUID(),
    compositionKey: crypto.randomUUID(),
    printfulProductTemplateId: template?.id ?? "",
    placementPresetId: preset?.id ?? "",
    technique: defaultTechnique(template),
    targetMarketplaces: ["ETSY"],
    ...globalDefaultsFromPreset(preset),
    selectedVariantIds: variantIds.slice(0, 1),
  };
}

function variantIdsFromTemplate(template?: PrintfulTemplateOption) {
  if (template?.variantOptions?.length) return template.variantOptions.filter((item) => item.inStock).map((item) => String(item.id));
  const color = stringArray(template?.allowedColorVariantIds);
  const size = stringArray(template?.allowedSizeVariantIds);
  const all = stringArray(template?.printfulVariantIds);
  const merged = [...new Set([...color, ...size, ...all])];
  return merged.length ? merged : all;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function techniqueOptionsFor(templateId: string, templates: PrintfulTemplateOption[]) {
  const template = templates.find((item) => item.id === templateId);
  const techniques = stringArray(template?.allowedTechniques);
  const values = techniques.length ? techniques : [defaultTechnique(template)];
  return values.map((value) => ({ value, label: value }));
}

function localDefaultsFromPreset(preset?: PlacementPresetOption, area?: PrintAreaOption): Omit<LocalSelectionForm, "id" | "compositionKey" | "localBaseProductId" | "mockupTemplateId" | "printAreaId" | "placementPresetId"> {
  const configuredScale = optionalNumber(preset?.defaultScale) ?? 1;
  const scale = area
    ? Math.max(area.minScale, Math.min(area.maxScale, configuredScale))
    : configuredScale;
  const placement = area
    ? clampPlacementToPrintArea(presetToInitialPlacement(
        {
          defaultWidthCm: optionalNumber(preset?.defaultWidthCm),
          defaultHeightCm: optionalNumber(preset?.defaultHeightCm),
          defaultX: optionalNumber(preset?.defaultX),
          defaultY: optionalNumber(preset?.defaultY),
          defaultScale: scale,
          alignment: preset?.alignment,
        },
        area,
      ), area)
    : { x: 0, y: 0, width: 400, height: 400, scale, rotation: 0 };
  const cmPosition = area ? toLocalSelectionPosition(placement, area, "CM") : null;

  return {
    unit: "PX",
    anchor: "TOP_LEFT",
    widthCm: cmPosition && "widthCm" in cmPosition ? String(cmPosition.widthCm) : "10",
    heightCm: cmPosition && "heightCm" in cmPosition ? String(cmPosition.heightCm) : "10",
    xCm: cmPosition && "xCm" in cmPosition ? String(cmPosition.xCm) : "0",
    yCm: cmPosition && "yCm" in cmPosition ? String(cmPosition.yCm) : "0",
    widthPx: String(placement.width),
    heightPx: String(placement.height),
    xPx: String(placement.x),
    yPx: String(placement.y),
    scale: String(placement.scale),
    rotation: String(placement.rotation),
    editorReady: false,
    preferContextInitialPlacement: true,
  };
}

function compositionPlacementTitle<T extends { compositionKey: string }>(items: T[], index: number, prefix: string) {
  const current = items[index];
  if (!current) return prefix;
  const keys = [...new Set(items.map((item) => item.compositionKey))];
  const group = items.filter((item) => item.compositionKey === current.compositionKey);
  const placementIndex = group.indexOf(current);
  return `${prefix} ${keys.indexOf(current.compositionKey) + 1} · Placement ${placementIndex + 1}`;
}

function variantLabel(template: PrintfulTemplateOption | undefined, variantId: string) {
  const variant = template?.variantOptions?.find((item) => String(item.id) === variantId);
  if (!variant) return `Variant ${variantId}`;
  return [variant.color, variant.size, variant.name].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ");
}

function localPlacement(selection: LocalSelectionForm, areas: PrintAreaOption[], presets: PlacementPresetOption[]) {
  const preset = presets.find((item) => item.id === selection.placementPresetId);
  if (preset?.placement) return preset.placement;
  const area = areas.find((item) => item.id === selection.printAreaId);
  return area?.placement || area?.mockupView?.placementCode || "FRONT";
}

function globalDefaultsFromPreset(preset?: PlacementPresetOption): Omit<GlobalSelectionForm, "id" | "compositionKey" | "printfulProductTemplateId" | "placementPresetId" | "technique" | "targetMarketplaces" | "selectedVariantIds" | "previewTaskKey" | "previewUrls" | "previewLoading"> {
  return {
    widthIn: stringValue(preset?.defaultWidthIn, "4"),
    heightIn: stringValue(preset?.defaultHeightIn, "4"),
    leftIn: stringValue(preset?.defaultX, "0"),
    topIn: stringValue(preset?.defaultY, "0"),
    scale: stringValue(preset?.defaultScale, "1"),
    editorReady: false,
    preferContextInitialPlacement: true,
  };
}

function formatPlacementLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PlacementArtworkNotice(props: {
  placement: string;
  versions?: Array<{ id: string; placement?: string | null }>;
}) {
  const normalized = props.placement.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const dedicated = props.versions?.find((version) => version.placement === normalized);
  const fallback = props.versions?.find((version) => !version.placement);
  const available = dedicated ?? fallback;
  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${available ? "border-brand-blue/20 bg-brand-lightBlue/20 text-brand-ink" : "border-status-danger/25 bg-status-danger/5 text-status-danger"}`}>
      <p className="font-medium">
        {dedicated
          ? `Using dedicated ${formatPlacementLabel(normalized)} artwork`
          : fallback
            ? `No dedicated ${formatPlacementLabel(normalized)} artwork; using legacy default artwork`
            : `Missing ${formatPlacementLabel(normalized)} artwork`}
      </p>
      {!available ? <p className="mt-1 text-xs">Ask the designer to upload artwork for this placement before approval.</p> : null}
    </div>
  );
}

function MissingPlacementArtworkState({ placement }: { placement: string }) {
  return (
    <div className="rounded-2xl border border-status-warning/30 bg-status-warning/5 p-4" role="status">
      <p className="font-semibold text-brand-ink">{formatPlacementLabel(placement)} artwork is required</p>
      <p className="mt-1 text-sm text-brand-muted">The visual editor cannot place a different print location without its matching artwork file. Ask the designer to upload this placement, then refresh the moderation page.</p>
      <p className="mt-3 text-xs font-medium text-brand-muted">The main front artwork is not reused automatically, preventing an unintended sleeve or back print.</p>
    </div>
  );
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

function optionalNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function printAreaSummary(area?: PrintAreaOption) {
  if (!area) return "Print area unavailable.";
  const transforms = [area.allowMove ? "move" : "fixed position", area.allowResize ? "resize" : "fixed size", area.allowRotate ? "rotate" : "no rotation"].join(" · ");
  const cm = area.widthCm && area.heightCm ? ` · ${area.widthCm}x${area.heightCm} cm` : "";
  const view = area.mockupView ? `${area.mockupView.name} (${area.mockupView.placementCode})` : "Legacy primary view";
  return `${view} · ${area.name}: print ${area.width}x${area.height}px, safe ${area.safeWidth}x${area.safeHeight}px${cm} · scale ${area.minScale}-${area.maxScale} · ${transforms}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-borderSoft p-4">
      <p className="text-xs font-medium uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  );
}

function ConfirmationDialog({ open, title, description, confirmLabel, destructive, busy, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void | Promise<void> }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();
    return () => returnFocusRef.current?.focus();
  }, [open]);
  if (!open) return null;
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) { event.preventDefault(); onCancel(); return; }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="fixed inset-0 z-modal grid place-items-center bg-brand-ink/50 p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onCancel(); }}><div ref={dialogRef} onKeyDown={handleKeyDown} role="alertdialog" aria-modal="true" aria-labelledby="moderation-confirm-title" aria-describedby="moderation-confirm-description" className="w-full max-w-md rounded-2xl border border-backoffice-border bg-backoffice-surface p-6 shadow-lg"><h2 id="moderation-confirm-title" className="text-xl font-bold text-backoffice-text">{title}</h2><p id="moderation-confirm-description" className="mt-2 text-sm leading-6 text-backoffice-subtle">{description}</p><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button ref={confirmRef} variant={destructive ? "danger" : "primaryPeach"} onClick={() => void onConfirm()} loading={busy}>{confirmLabel}</Button></div></div></div>;
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20">
        <option value="">Select</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <TextField label={label} value={value} onChange={onChange} type="number" disabled={disabled} />;
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="block text-sm font-medium text-brand-ink">
      {label}
      <input value={value} type={type} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-2 h-12 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-brand-muted" />
    </label>
  );
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function scrollToElement(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
