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
  const normalized = placement.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return Boolean(versions?.some((version) => version.placement === normalized || version.placement == null));
}
