import type { DesignStatus } from "../../lib/api";

const STORY_PUBLICATION_DESIGN_STATUSES: ReadonlySet<DesignStatus> = new Set([
  "APPROVED_LOCAL",
  "APPROVED_GLOBAL",
  "APPROVED",
  "READY_FOR_MOCKUP",
  "READY_TO_PUBLISH",
  "PUBLISHED",
]);

export function isDesignApprovedForStoryPublication(status: DesignStatus) {
  return STORY_PUBLICATION_DESIGN_STATUSES.has(status);
}
