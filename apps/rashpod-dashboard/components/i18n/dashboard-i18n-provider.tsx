"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DASHBOARD_LOCALE_COOKIE,
  dashboardLocaleTag,
  getDashboardLocale,
  interpolateDashboardCopy,
  translateDashboardCopy,
  type DashboardLocale,
  type DashboardMessages,
} from "../../lib/i18n";

interface DashboardI18nContextValue {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => Promise<void>;
  isLocaleLoading: boolean;
  t: (source: string, values?: Record<string, string | number>) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
}

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(null);
const originalText = new WeakMap<Text, string>();
const appliedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const appliedAttributes = new WeakMap<Element, Map<string, string>>();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "NOSCRIPT", "TEXTAREA"]);

const clientCatalogLoaders: Record<Exclude<DashboardLocale, "en">, () => Promise<DashboardMessages>> = {
  uz: async () => (await import("../../messages/uz.json")).default,
  ru: async () => (await import("../../messages/ru.json")).default,
  fr: async () => (await import("../../messages/fr.json")).default,
};

async function loadClientMessages(locale: DashboardLocale): Promise<DashboardMessages> {
  return locale === "en" ? {} : clientCatalogLoaders[locale]();
}

function translatedValue(locale: DashboardLocale, source: string, messages: DashboardMessages): string {
  const trimmed = source.trim();
  if (!trimmed) return source;
  const translated = translateDashboardCopy(locale, trimmed, messages);
  if (translated === trimmed) return source;
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function localizeTextNode(node: Text, locale: DashboardLocale, messages: DashboardMessages) {
  const parent = node.parentElement;
  if (
    !parent ||
    SKIPPED_TAGS.has(parent.tagName) ||
    parent.closest("script, style, code, pre, noscript, textarea, [translate='no']") ||
    parent.isContentEditable
  ) return;

  const previousApplied = appliedText.get(node);
  if (!originalText.has(node) || (previousApplied !== undefined && node.data !== previousApplied)) {
    originalText.set(node, node.data);
  }
  const source = originalText.get(node) ?? node.data;
  const next = locale === "en" ? source : translatedValue(locale, source, messages);
  if (node.data !== next) node.data = next;
  appliedText.set(node, next);
}

function localizeElementAttributes(element: Element, locale: DashboardLocale, messages: DashboardMessages) {
  let originals = originalAttributes.get(element);
  let applied = appliedAttributes.get(element);
  if (!originals) {
    originals = new Map();
    originalAttributes.set(element, originals);
  }
  if (!applied) {
    applied = new Map();
    appliedAttributes.set(element, applied);
  }

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    const previousApplied = applied.get(attribute);
    if (!originals.has(attribute) || (previousApplied !== undefined && current !== previousApplied)) {
      originals.set(attribute, current);
    }
    const source = originals.get(attribute) ?? current;
    const next = locale === "en" ? source : translatedValue(locale, source, messages);
    if (current !== next) element.setAttribute(attribute, next);
    applied.set(attribute, next);
  }
}

function localizeSubtree(root: Node, locale: DashboardLocale, messages: DashboardMessages) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root as Text, locale, messages);
    return;
  }
  if (!(root instanceof Element) && !(root instanceof DocumentFragment)) return;
  if (root instanceof Element) localizeElementAttributes(root, locale, messages);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node as Text, locale, messages);
    else localizeElementAttributes(node as Element, locale, messages);
    node = walker.nextNode();
  }
}

export function DashboardI18nProvider({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: DashboardLocale;
  initialMessages: DashboardMessages;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [messages, setMessages] = useState(initialMessages);
  const [isLocaleLoading, setIsLocaleLoading] = useState(false);
  const localeRequest = useRef(0);

  const setLocale = useCallback(async (nextLocale: DashboardLocale) => {
    const normalized = getDashboardLocale(nextLocale);
    if (normalized === locale) return;
    const request = ++localeRequest.current;
    setIsLocaleLoading(true);
    let nextMessages: DashboardMessages;
    try {
      nextMessages = await loadClientMessages(normalized);
    } catch (error) {
      console.error("Dashboard locale catalog failed to load", { locale: normalized, error });
      if (request === localeRequest.current) setIsLocaleLoading(false);
      return;
    }
    if (request !== localeRequest.current) return;
    setMessages(nextMessages);
    setLocaleState(normalized);
    window.localStorage.setItem(DASHBOARD_LOCALE_COOKIE, normalized);
    document.cookie = `${DASHBOARD_LOCALE_COOKIE}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setIsLocaleLoading(false);
  }, [locale]);

  useLayoutEffect(() => {
    const storedValue = window.localStorage.getItem(DASHBOARD_LOCALE_COOKIE);
    const stored = getDashboardLocale(storedValue);
    if (stored !== locale && storedValue) {
      void setLocale(stored);
      return;
    }
    window.localStorage.setItem(DASHBOARD_LOCALE_COOKIE, locale);
  }, [locale, setLocale]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    localizeSubtree(document.body, locale, messages);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") localizeSubtree(mutation.target, locale, messages);
        if (mutation.type === "attributes") localizeElementAttributes(mutation.target as Element, locale, messages);
        for (const node of mutation.addedNodes) localizeSubtree(node, locale, messages);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
    return () => observer.disconnect();
  }, [locale, messages]);

  const value = useMemo<DashboardI18nContextValue>(() => {
    const localeTag = dashboardLocaleTag(locale);
    return {
      locale,
      setLocale,
      isLocaleLoading,
      t: (source, values) =>
        values
          ? interpolateDashboardCopy(locale, source, values, messages)
          : translateDashboardCopy(locale, source, messages),
      formatDate: (input, options) =>
        new Intl.DateTimeFormat(localeTag, options).format(input instanceof Date ? input : new Date(input)),
      formatNumber: (input, options) => new Intl.NumberFormat(localeTag, options).format(input),
      formatCurrency: (input, currency = "UZS") =>
        new Intl.NumberFormat(localeTag, { style: "currency", currency }).format(input),
    };
  }, [isLocaleLoading, locale, messages, setLocale]);

  return <DashboardI18nContext.Provider value={value}>{children}</DashboardI18nContext.Provider>;
}

export function useDashboardI18n(): DashboardI18nContextValue {
  const context = useContext(DashboardI18nContext);
  if (!context) throw new Error("useDashboardI18n must be used within DashboardI18nProvider");
  return context;
}
