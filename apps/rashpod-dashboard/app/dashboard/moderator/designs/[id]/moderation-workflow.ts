import type { DesignWorkflowDetail } from "../../../../../lib/api";

export type WorkflowStep = 1 | 2 | 3 | 4;

type WorkflowState = Pick<DesignWorkflowDetail, "status" | "listings" | "productSelections">;

export function inferWorkflowStep(detail: WorkflowState): WorkflowStep {
  if (["SUBMITTED", "PENDING_MODERATION"].includes(detail.status)) return 1;
  if (detail.listings?.length) return 4;
  return detail.productSelections?.length ? 3 : 1;
}

export function placementArtworkAvailable(
  versions: Array<{ placement?: string | null }> | undefined,
  placement: string,
) {
  const normalized = normalizePlacement(placement);
  return Boolean(versions?.some((version) => version.placement == null || normalizePlacement(version.placement) === normalized));
}

export function normalizePlacement(placement: string) {
  const normalized = placement.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const canonical = new Set(["FRONT", "BACK", "LEFT_CHEST", "RIGHT_CHEST", "LEFT_SLEEVE", "RIGHT_SLEEVE", "FULL_WRAP", "OTHER"]);
  if (canonical.has(normalized)) return normalized;

  const tokens = new Set(normalized.split("_").filter(Boolean));
  if (tokens.has("SLEEVE") && tokens.has("LEFT")) return "LEFT_SLEEVE";
  if (tokens.has("SLEEVE") && tokens.has("RIGHT")) return "RIGHT_SLEEVE";
  if (tokens.has("CHEST") && tokens.has("LEFT")) return "LEFT_CHEST";
  if (tokens.has("CHEST") && tokens.has("RIGHT")) return "RIGHT_CHEST";
  if (tokens.has("CHEST")) return "FRONT";
  if (tokens.has("WRAP") || (tokens.has("ALL") && tokens.has("OVER"))) return "FULL_WRAP";
  if (tokens.has("BACK")) return "BACK";
  if (tokens.has("FRONT")) return "FRONT";
  return "OTHER";
}
