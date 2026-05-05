import { DesignStatus, ModerationDecision } from "@prisma/client";
import { statusToDecision } from "../src/modules/moderation/moderation-policy";

describe("statusToDecision", () => {
  it("maps approved to approve", () => {
    expect(statusToDecision(DesignStatus.APPROVED)).toBe(ModerationDecision.APPROVE);
  });

  it("returns undefined for non-decision states", () => {
    expect(statusToDecision(DesignStatus.DRAFT)).toBeUndefined();
  });

  it("maps reject/request-changes/suspend", () => {
    expect(statusToDecision(DesignStatus.REJECTED)).toBe(ModerationDecision.REJECT);
    expect(statusToDecision(DesignStatus.NEEDS_FIX)).toBe(ModerationDecision.REQUEST_CHANGES);
    expect(statusToDecision(DesignStatus.SUSPENDED)).toBe(ModerationDecision.SUSPEND);
  });
});
