import { createHash } from "crypto";

export type StoryLocale = "uz" | "ru" | "en";
export type StoryLocalizedText = Partial<Record<StoryLocale, string>>;

export const STORY_LOCALES: StoryLocale[] = ["uz", "ru", "en"];

export function storySourceFingerprint(locale: StoryLocale, title: string, body: string) {
  return createHash("sha256")
    .update(JSON.stringify([locale, title.trim(), body.trim()]))
    .digest("hex");
}

export function hasCompleteStoryTranslations(
  titles: StoryLocalizedText,
  bodies: StoryLocalizedText,
) {
  return STORY_LOCALES.every(
    (locale) => Boolean(titles[locale]?.trim() && bodies[locale]?.trim()),
  );
}

export function storyTranslationsAreCurrent(
  meta: Record<string, unknown>,
  sourceFingerprint: string,
) {
  return meta.translationsSourceFingerprint === sourceFingerprint;
}

export function clearNonSourceTranslations(
  titles: StoryLocalizedText,
  bodies: StoryLocalizedText,
  sourceLocale: StoryLocale,
) {
  for (const locale of STORY_LOCALES) {
    if (locale === sourceLocale) continue;
    delete titles[locale];
    delete bodies[locale];
  }
}
