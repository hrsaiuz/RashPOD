import { describe, expect, it } from "vitest";
import { moderatorPrintAreasForTemplate, preferredAreaForPreset } from "./local-print-area-selection";

describe("moderator local print-area selection", () => {
  const areas = [
    { id: "front", mockupTemplateId: "shirt", defaultPresetId: "front-preset", placement: "FRONT", isActive: true, mockupView: { isActive: true } },
    { id: "back", mockupTemplateId: "shirt", defaultPresetId: "back-preset", placement: "BACK", isActive: true, mockupView: { isActive: true } },
    { id: "sleeve", mockupTemplateId: "shirt", placement: "LEFT_SLEEVE", isActive: true, mockupView: { isActive: true } },
    { id: "inactive", mockupTemplateId: "shirt", placement: "OTHER", isActive: false, mockupView: { isActive: true } },
    { id: "inactive-view", mockupTemplateId: "shirt", placement: "OTHER", isActive: true, mockupView: { isActive: false } },
  ];

  it("shows every active area for the template regardless of the selected preset placement", () => {
    expect(moderatorPrintAreasForTemplate(areas, "shirt").map((area) => area.id)).toEqual(["front", "back", "sleeve"]);
  });

  it("maps an automatically generated preset back to its owning print area", () => {
    const available = moderatorPrintAreasForTemplate(areas, "shirt");
    expect(preferredAreaForPreset(available, { id: "back-preset", placement: "BACK" })?.id).toBe("back");
  });
});
