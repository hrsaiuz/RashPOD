"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

export function PlacementChips(props: {
  presets: Array<{ id: string; placement: string; name: string }>;
  selectedId: string;
  onSelect: (presetId: string) => void;
}) {
  if (!props.presets.length) {
    return <p className="text-xs text-brand-muted">No optional placement shortcuts configured. Use the admin-defined print area and safe zone below.</p>;
  }

  const placements = [...new Set(props.presets.map((item) => item.placement))];

  return (
    <div className="flex flex-wrap gap-2">
      {placements.map((placement) => {
        const preset = props.presets.find((item) => item.placement === placement);
        if (!preset) return null;
        const selected = props.selectedId === preset.id || props.presets.find((item) => item.id === props.selectedId)?.placement === placement;
        return (
          <button
            key={placement}
            type="button"
            onClick={() => props.onSelect(preset.id)}
            className={`rounded-pill border px-3 py-1.5 text-xs font-semibold uppercase transition ${
              selected ? "border-brand-blue bg-brand-blue/10 text-brand-blue" : "border-surface-borderSoft text-brand-ink hover:border-brand-blue/40"
            }`}
          >
            {formatPlacementLabel(placement)}
          </button>
        );
      })}
    </div>
  );
}

export function ReadinessChecklist(props: {
  items: Array<{ label: string; ok: boolean; warn?: boolean }>;
}) {
  const allOk = props.items.every((item) => item.ok);
  return (
    <div className={`rounded-xl border p-3 ${allOk ? "border-status-success/30 bg-status-success/5" : "border-surface-borderSoft bg-white/80"}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Approval readiness</p>
      <ul className="space-y-1.5">
        {props.items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.ok ? (
              <CheckCircle2 size={16} className="shrink-0 text-status-success" />
            ) : item.warn ? (
              <AlertCircle size={16} className="shrink-0 text-status-warning" />
            ) : (
              <Circle size={16} className="shrink-0 text-brand-muted" />
            )}
            <span className={item.ok ? "text-brand-ink" : item.warn ? "text-status-warning" : "text-brand-muted"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MockupErrorHint({ code, details }: { code?: string | null; details?: unknown }) {
  if (!code) return null;
  const detail = mockupFailureDetail(details);
  const message = code.startsWith("PRINTFUL_REQUEST_FAILED:4")
    ? "Printful rejected this product configuration. Review the product, variants, technique, placement, and artwork file before trying again."
    : MOCKUP_ERROR_HINTS[code] ?? code.replace(/_/g, " ").toLowerCase();
  return (
    <div role="alert" className="mt-2 max-w-2xl rounded-xl border border-status-danger/20 bg-status-danger/5 p-3 text-sm text-status-danger">
      <p className="font-medium">{message}</p>
      {detail.providerMessage ? <p className="mt-1">Printful: {detail.providerMessage}</p> : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
        {detail.operation ? <span>Stage: {formatPlacementLabel(detail.operation)}</span> : null}
        {detail.providerStatus ? <span>HTTP {detail.providerStatus}</span> : null}
        {detail.providerRequestId ? <span>Request: {detail.providerRequestId}</span> : null}
      </div>
    </div>
  );
}

export function isMockupRetryable(code?: string | null, details?: unknown) {
  const detail = mockupFailureDetail(details);
  if (typeof detail.retryable === "boolean") return detail.retryable;
  if (!code) return false;
  const match = /^PRINTFUL_REQUEST_FAILED:(\d{3})$/.exec(code);
  if (match) {
    const status = Number(match[1]);
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
  }
  return code === "PRINTFUL_MOCKUP_TIMEOUT" || code === "PRINTFUL_MOCKUP_EMPTY" || code.startsWith("PRINTFUL_MOCKUP_DOWNLOAD_FAILED:");
}

export function isMockupConfigurationFailure(code?: string | null) {
  if (!code) return false;
  return code.startsWith("PRINTFUL_REQUEST_FAILED:4")
    || code === "INVALID_PLACEMENT"
    || code === "INVALID_PRINTFUL_TECHNIQUE"
    || code === "INVALID_PRINTFUL_VARIANT"
    || code === "POSITION_OUTSIDE_PRINT_AREA"
    || code === "PRINTFUL_PRINT_AREA_MISSING"
    || code === "LOCAL_MOCKUP_GENERATION_FAILED";
}

type MockupFailureDetail = {
  retryable?: boolean;
  providerMessage?: string;
  providerStatus?: number;
  providerRequestId?: string;
  operation?: string;
};

function mockupFailureDetail(value: unknown): MockupFailureDetail {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as MockupFailureDetail;
}

const MOCKUP_ERROR_HINTS: Record<string, string> = {
  INVALID_PLACEMENT: "Placement is outside the printable area or not allowed for this product.",
  INVALID_PRINTFUL_TECHNIQUE: "Selected print technique is not supported for this Printful product.",
  INVALID_PRINTFUL_VARIANT: "No valid Printful variant is configured for mockup generation.",
  PRINTFUL_NOT_CONFIGURED: "Printful integration is disabled. Enable it in admin settings.",
  PRINTFUL_API_TOKEN_MISSING: "Printful API token is missing.",
  PRINTFUL_MOCKUP_FAILED: "Printful rejected the mockup task. Adjust placement and retry.",
  PRINTFUL_MOCKUP_TIMEOUT: "Printful mockup generation timed out. Retry the task.",
  POSITION_OUTSIDE_PRINT_AREA: "Design placement exceeds the Printful print area bounds.",
};

function formatPlacementLabel(placement: string) {
  return placement.replace(/_/g, " ").toLowerCase();
}

export function formatPlacementKind(placement: string) {
  return formatPlacementLabel(placement);
}
