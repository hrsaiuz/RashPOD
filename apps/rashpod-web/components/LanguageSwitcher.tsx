"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { usePathname, useRouter } from "../i18n/navigation";
import { routing, type AppLocale } from "../i18n/routing";

const LOCALES: Record<AppLocale, { label: string; nativeName: string; flag: string }> = {
  uz: { label: "Uzbek", nativeName: "O'zbek", flag: "🇺🇿" },
  ru: { label: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  en: { label: "English", nativeName: "English", flag: "🇺🇸" },
};

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = LOCALES[locale];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Select language"
        className="inline-flex h-[38px] min-w-[148px] items-center justify-between gap-3 rounded-[12px] border border-surface-borderSoft bg-white px-3 text-[13px] font-medium text-brand-ink shadow-xs transition-colors hover:bg-brand-bg focus:outline-none focus:ring-4 focus:ring-brand-blue/20"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <span aria-hidden="true" className="text-base leading-none">{current.flag}</span>
          <span className="truncate">{current.nativeName}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-dropdown min-w-[196px] overflow-hidden rounded-[16px] border border-surface-borderSoft bg-white p-1.5 shadow-lift"
        >
          {routing.locales.map((code) => {
            const option = LOCALES[code];
            const active = locale === code;

            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[13px] transition-colors ${
                  active ? "bg-brand-blue/10 text-brand-blue" : "text-brand-ink hover:bg-brand-bg"
                }`}
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: code });
                }}
              >
                <span className="inline-flex items-center gap-3">
                  <span aria-hidden="true" className="text-base leading-none">{option.flag}</span>
                  <span>
                    <span className="block font-medium">{option.nativeName}</span>
                    <span className="block text-[11px] text-brand-muted">{option.label}</span>
                  </span>
                </span>
                {active ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
