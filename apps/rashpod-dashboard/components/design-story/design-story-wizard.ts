export type StoryTranslationDrafts = {
  ru: { title: string; body: string };
  en: { title: string; body: string };
};

export function hasCompleteStoryTranslations(translations: StoryTranslationDrafts) {
  return (
    translations.ru.title.trim().length > 0 &&
    translations.ru.body.trim().length > 0 &&
    translations.en.title.trim().length > 0 &&
    translations.en.body.trim().length > 0
  );
}
