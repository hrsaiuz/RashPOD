"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "../i18n/navigation";
import { routing, type AppLocale } from "../i18n/routing";

const LABELS: Record<AppLocale, string> = {
  uz: "Oʻzbek",
  ru: "Рус",
  en: "EN",
};

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="inline-flex items-center rounded-[10px] border border-surface-borderSoft p-0.5 text-[12px] font-semibold">
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          aria-current={locale === code ? "true" : undefined}
          className={`rounded-[8px] px-2.5 py-1 transition-colors ${locale === code ? "bg-brand-blue text-white" : "text-brand-muted hover:text-brand-ink"}`}
          onClick={() => router.replace(pathname, { locale: code })}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
