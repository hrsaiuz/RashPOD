import { describe, expect, it } from "vitest";
import { dashboardErrorMessage } from "./use-dashboard-feedback";

describe("dashboard action feedback", () => {
  it("uses actionable API error messages when available", () => {
    expect(dashboardErrorMessage(new Error("Choose a delivery provider."), "Action failed."))
      .toBe("Choose a delivery provider.");
  });

  it("falls back for unknown failures", () => {
    expect(dashboardErrorMessage(null, "Action failed.")).toBe("Action failed.");
  });
});
