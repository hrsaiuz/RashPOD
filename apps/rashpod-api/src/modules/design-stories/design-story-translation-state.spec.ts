import {
  clearNonSourceTranslations,
  hasCompleteStoryTranslations,
  storySourceFingerprint,
  storyTranslationsAreCurrent,
} from "./design-story-translation-state";

describe("design story translation state", () => {
  it("changes the source fingerprint when Uzbek content changes", () => {
    const first = storySourceFingerprint("uz", "Sarlavha", "Birinchi hikoya");
    const second = storySourceFingerprint("uz", "Sarlavha", "Yangilangan hikoya");

    expect(second).not.toBe(first);
    expect(
      storyTranslationsAreCurrent(
        { translationsSourceFingerprint: first },
        second,
      ),
    ).toBe(false);
  });

  it("clears target languages when the source changes", () => {
    const titles = { uz: "Sarlavha", ru: "Название", en: "Title" };
    const bodies = { uz: "Hikoya", ru: "История", en: "Story" };

    clearNonSourceTranslations(titles, bodies, "uz");

    expect(titles).toEqual({ uz: "Sarlavha" });
    expect(bodies).toEqual({ uz: "Hikoya" });
    expect(hasCompleteStoryTranslations(titles, bodies)).toBe(false);
  });

  it("requires title and body in all three languages", () => {
    expect(
      hasCompleteStoryTranslations(
        { uz: "Sarlavha", ru: "Название", en: "Title" },
        { uz: "Hikoya", ru: "История", en: "" },
      ),
    ).toBe(false);
  });
});
