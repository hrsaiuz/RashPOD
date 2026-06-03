"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

export function PlacementChips(props: {
  presets: Array<{ id: string; placement: string; name: string }>;
  selectedId: string;
  onSelect: (presetId: string) => void;
}) {
  if (!props.presets.length) {
    return <p className="text-xs text-brand-muted">No placement presets configured.</p>;
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

export function MockupErrorHint({ code }: { code?: string | null }) {
  if (!code) return null;
  const message = MOCKUP_ERROR_HINTS[code] ?? code.replace(/_/g, " ").toLowerCase();
  return <p className="mt-1 text-xs text-status-danger">{message}</p>;
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
