"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { DASHBOARD_LOCALES, DASHBOARD_LOCALE_NAMES, type DashboardLocale } from "../../lib/i18n";
import { useDashboardI18n } from "./dashboard-i18n-provider";

const LOCALE_DETAILS: Record<DashboardLocale, { englishName: string }> = {
  uz: { englishName: "Uzbek" },
  en: { englishName: "English" },
  ru: { englishName: "Russian" },
  fr: { englishName: "French" },
};

function LocaleFlag({ locale }: { locale: DashboardLocale }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className="h-4 w-6 shrink-0 rounded-[3px] ring-1 ring-black/10"
      data-testid={`locale-flag-${locale}`}
      aria-hidden="true"
    >
      {locale === "uz" ? (
        <>
          <path fill="#1EB7D8" d="M0 0h24v5H0z" />
          <path fill="#CE1126" d="M0 5h24v1H0zM0 10h24v1H0z" />
          <path fill="#fff" d="M0 6h24v4H0z" />
          <path fill="#1EB53A" d="M0 11h24v5H0z" />
          <circle cx="4.4" cy="2.5" r="1.7" fill="#fff" />
          <circle cx="5.1" cy="2.5" r="1.45" fill="#1EB7D8" />
          <circle cx="8.2" cy="1.7" r=".35" fill="#fff" />
          <circle cx="9.5" cy="2.6" r=".35" fill="#fff" />
          <circle cx="8.2" cy="3.5" r=".35" fill="#fff" />
        </>
      ) : locale === "en" ? (
        <>
          <path fill="#21468B" d="M0 0h24v16H0z" />
          <path stroke="#fff" strokeWidth="4" d="m0 0 24 16M24 0 0 16" />
          <path stroke="#CF142B" strokeWidth="1.8" d="m0 0 24 16M24 0 0 16" />
          <path fill="#fff" d="M9 0h6v16H9zM0 5h24v6H0z" />
          <path fill="#CF142B" d="M10.5 0h3v16h-3zM0 6.5h24v3H0z" />
        </>
      ) : locale === "ru" ? (
        <>
          <path fill="#fff" d="M0 0h24v5.34H0z" />
          <path fill="#0039A6" d="M0 5.33h24v5.34H0z" />
          <path fill="#D52B1E" d="M0 10.66h24V16H0z" />
        </>
      ) : (
        <>
          <path fill="#002395" d="M0 0h8v16H0z" />
          <path fill="#fff" d="M8 0h8v16H8z" />
          <path fill="#ED2939" d="M16 0h8v16h-8z" />
        </>
      )}
    </svg>
  );
}

export function DashboardLanguageSwitcher({ compactOnMobile = true }: { compactOnMobile?: boolean }) {
  const { locale, setLocale, t, isLocaleLoading } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function selectLocale(nextLocale: DashboardLocale) {
    setOpen(false);
    if (nextLocale !== locale) await setLocale(nextLocale);
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Language")}
        disabled={isLocaleLoading}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex h-11 items-center justify-between gap-2 rounded-xl border border-backoffice-border bg-backoffice-surface px-3 text-sm font-medium text-backoffice-text transition-colors hover:bg-backoffice-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-backoffice-focus disabled:cursor-wait disabled:opacity-70 ${
          compactOnMobile ? "min-w-[88px] sm:min-w-[176px]" : "min-w-[176px]"
        }`}
      >
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <LocaleFlag locale={locale} />
          <span className={compactOnMobile ? "font-semibold uppercase sm:hidden" : "hidden"} aria-hidden="true">
            {locale}
          </span>
          <span className={compactOnMobile ? "hidden truncate sm:inline" : "truncate"}>
            {DASHBOARD_LOCALE_NAMES[locale]}
          </span>
        </span>
        {isLocaleLoading ? (
          <LoaderCircle size={16} className="shrink-0 animate-spin text-brand-muted motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-brand-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("Language")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-dropdown min-w-[224px] overflow-hidden rounded-2xl border border-backoffice-border bg-backoffice-surface p-1.5 shadow-lift"
        >
          {DASHBOARD_LOCALES.map((item) => {
            const details = LOCALE_DETAILS[item];
            const active = item === locale;

            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => void selectLocale(item)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-backoffice-focus ${
                  active ? "bg-brand-blue/10 text-brand-blue" : "text-backoffice-text hover:bg-backoffice-muted"
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-3">
                  <LocaleFlag locale={item} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{DASHBOARD_LOCALE_NAMES[item]}</span>
                    <span className="block text-xs text-backoffice-subtle">{details.englishName}</span>
                  </span>
                </span>
                {active ? <Check size={16} className="shrink-0" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
