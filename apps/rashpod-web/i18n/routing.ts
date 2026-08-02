import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "en", "ru", "fr"],
  defaultLocale: "uz",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
