import { describe, expect, it } from "vitest";
import { buildModerationDecisionPayload } from "./moderation-decision-payload";

describe("buildModerationDecisionPayload", () => {
  it("keeps local approval free of global selections", () => {
    expect(buildModerationDecisionPayload({ decision: "APPROVE_LOCAL", localSelections: [{ id: "local" }], globalPrintfulSelections: [{ id: "global" }], rejectionReasons: [] })).toEqual({
      decision: "APPROVE_LOCAL",
      localSelections: [{ id: "local" }],
      globalPrintfulSelections: undefined,
      moderatorNotes: undefined,
    });
  });

  it("includes local and Printful selections for global approval", () => {
    expect(buildModerationDecisionPayload({ decision: "APPROVE_GLOBAL", localSelections: [{ id: "local" }], globalPrintfulSelections: [{ id: "global" }], rejectionReasons: [], moderatorNotes: "checked" })).toMatchObject({
      decision: "APPROVE_GLOBAL",
      localSelections: [{ id: "local" }],
      globalPrintfulSelections: [{ id: "global" }],
      moderatorNotes: "checked",
    });
  });

  it("does not leak product selections into rejection payloads", () => {
    const payload = buildModerationDecisionPayload({ decision: "REJECT", localSelections: [{ id: "local" }], globalPrintfulSelections: [{ id: "global" }], rejectionReasons: ["LOW_IMAGE_RESOLUTION"] });
    expect(payload).toEqual({ decision: "REJECT", rejectionReasons: ["LOW_IMAGE_RESOLUTION"], customRejectionReason: undefined, moderatorNotes: undefined });
    expect(payload).not.toHaveProperty("localSelections");
  });
});
