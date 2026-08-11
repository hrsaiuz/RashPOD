import { describe, expect, it } from "vitest";
import type { DesignWorkflowDetail } from "../../../../../lib/api";
import { inferWorkflowStep, placementArtworkAvailable } from "./moderation-workflow";

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

describe("placement artwork readiness", () => {
  it("accepts a package containing only one explicit placement", () => {
    const versions = [{ placement: "LEFT_SLEEVE" }];

    expect(placementArtworkAvailable(versions, "left-sleeve")).toBe(true);
    expect(placementArtworkAvailable(versions, "FRONT")).toBe(false);
  });

  it("accepts each placement in a multi-placement package independently", () => {
    const versions = [{ placement: "FRONT" }, { placement: "BACK" }, { placement: "RIGHT_SLEEVE" }];

    expect(placementArtworkAvailable(versions, "front")).toBe(true);
    expect(placementArtworkAvailable(versions, "BACK")).toBe(true);
    expect(placementArtworkAvailable(versions, "right sleeve")).toBe(true);
    expect(placementArtworkAvailable(versions, "LEFT_CHEST")).toBe(false);
  });

  it("does not reuse explicit front artwork for a sleeve", () => {
    expect(placementArtworkAvailable([{ placement: "FRONT" }], "left_sleeve")).toBe(false);
  });

  it("accepts matching placement artwork and legacy defaults", () => {
    expect(placementArtworkAvailable([{ placement: "LEFT_SLEEVE" }], "left sleeve")).toBe(true);
    expect(placementArtworkAvailable([{ placement: null }], "LEFT_SLEEVE")).toBe(true);
  });

  it("maps Printful direction-last and decorated chest aliases to canonical artwork", () => {
    expect(placementArtworkAvailable([{ placement: "LEFT_SLEEVE" }], "sleeve_left")).toBe(true);
    expect(placementArtworkAvailable([{ placement: "RIGHT_SLEEVE" }], "embroidery-sleeve-right")).toBe(true);
    expect(placementArtworkAvailable([{ placement: "LEFT_CHEST" }], "embroidery_chest_left")).toBe(true);
    expect(placementArtworkAvailable([{ placement: "FRONT" }], "embroidery_chest_center")).toBe(true);
  });
});
