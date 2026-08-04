"use client";

import { ChevronDown, Languages, LoaderCircle } from "lucide-react";
import { DASHBOARD_LOCALES, DASHBOARD_LOCALE_NAMES, type DashboardLocale } from "../../lib/i18n";
import { useDashboardI18n } from "./dashboard-i18n-provider";

export function DashboardLanguageSwitcher({ compactOnMobile = true }: { compactOnMobile?: boolean }) {
  const { locale, setLocale, t, isLocaleLoading } = useDashboardI18n();

  return (
    <label className="relative flex min-h-11 shrink-0 items-center rounded-xl border border-backoffice-border bg-backoffice-surface pl-9 hover:bg-backoffice-muted focus-within:ring-2 focus-within:ring-backoffice-focus">
      {isLocaleLoading ? (
        <LoaderCircle size={17} className="pointer-events-none absolute left-3 animate-spin text-brand-muted motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Languages size={17} className="pointer-events-none absolute left-3 text-brand-muted" aria-hidden="true" />
      )}
      <span className="sr-only">{t("Language")}</span>
      {compactOnMobile ? (
        <span className="pr-7 text-xs font-semibold uppercase text-backoffice-text sm:hidden" aria-hidden="true">
          {locale}
        </span>
      ) : null}
      <select
        value={locale}
        onChange={(event) => void setLocale(event.target.value as DashboardLocale)}
        disabled={isLocaleLoading}
        aria-label={t("Language")}
        className={`${compactOnMobile ? "absolute inset-0 h-full w-full opacity-0 sm:static sm:h-11 sm:w-auto sm:opacity-100" : "h-11 w-auto"} cursor-pointer appearance-none bg-transparent py-0 pl-0 pr-7 text-sm font-medium text-backoffice-text outline-none disabled:cursor-wait disabled:opacity-70`}
      >
        {DASHBOARD_LOCALES.map((item) => (
          <option key={item} value={item}>
            {DASHBOARD_LOCALE_NAMES[item]}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2 text-brand-muted" aria-hidden="true" />
    </label>
  );
}
