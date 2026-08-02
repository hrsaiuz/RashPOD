import "server-only";

import type { DashboardLocale, DashboardMessages } from "./i18n";

export async function loadDashboardMessages(locale: DashboardLocale): Promise<DashboardMessages> {
  switch (locale) {
    case "uz":
      return (await import("../messages/uz.json")).default;
    case "ru":
      return (await import("../messages/ru.json")).default;
    case "fr":
      return (await import("../messages/fr.json")).default;
    default:
      return {};
  }
}
