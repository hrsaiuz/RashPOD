import { describe, expect, it } from "vitest";
import type { DesignWorkflowDetail } from "../../../../../lib/api";
import { inferWorkflowStep } from "./moderation-workflow";

function workflowDetail(
  overrides: Partial<Pick<DesignWorkflowDetail, "status" | "listings" | "productSelections">>,
) {
  return {
    status: "APPROVED_LOCAL",
    listings: [],
    productSelections: [],
    ...overrides,
  } as Pick<DesignWorkflowDetail, "status" | "listings" | "productSelections">;
}

describe("moderator workflow re-entry", () => {
  it("returns to review while moderation is pending", () => {
    expect(inferWorkflowStep(workflowDetail({ status: "PENDING_MODERATION" }))).toBe(1);
  });

  it("returns to mockups when selections exist without listings", () => {
    expect(inferWorkflowStep(workflowDetail({ productSelections: [{ id: "selection-1" }] as never }))).toBe(3);
  });

  it.each(["DRAFT", "READY_FOR_REVIEW", "PUBLISHED"] as const)(
    "keeps the workflow on listing for a %s listing",
    (status) => {
      expect(inferWorkflowStep(workflowDetail({ listings: [{ id: "listing-1", status }] as never }))).toBe(4);
    },
  );
});
