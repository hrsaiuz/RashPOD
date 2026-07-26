import { describe, expect, it } from "vitest";
import { hasCompleteStoryTranslations } from "./design-story-wizard";

describe("design story wizard", () => {
  it("requires complete Russian and English drafts", () => {
    expect(
      hasCompleteStoryTranslations({
        ru: { title: "Название", body: "История" },
        en: { title: "Title", body: "" },
      }),
    ).toBe(false);
  });

  it("accepts reviewed Russian and English drafts", () => {
    expect(
      hasCompleteStoryTranslations({
        ru: { title: "Название", body: "История" },
        en: { title: "Title", body: "Story" },
      }),
    ).toBe(true);
  });
});
