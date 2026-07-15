"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CatalogFilterKey = "q" | "sort" | "categories" | "designers" | "priceMin" | "priceMax" | "hasFilm" | "page";

export function useCatalogFilters(defaultSort = "newest") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(query);

  useEffect(() => setSearch(query), [query]);

  const setParams = useCallback((patch: Partial<Record<CatalogFilterKey, string | string[] | boolean | null>>, options?: { keepPage?: boolean }) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === false || value === "" || (Array.isArray(value) && value.length === 0)) next.delete(key);
      else next.set(key, Array.isArray(value) ? value.join(",") : value === true ? "true" : String(value));
    }
    if (!options?.keepPage && !("page" in patch)) next.delete("page");
    const href = next.size ? `${pathname}?${next.toString()}` : pathname;
    router.push(href, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (search === query) return;
    const timer = window.setTimeout(() => setParams({ q: search }), 250);
    return () => window.clearTimeout(timer);
  }, [query, search, setParams]);

  const values = useMemo(() => ({
    q: query,
    sort: searchParams.get("sort") ?? defaultSort,
    categories: split(searchParams.get("categories")),
    designers: split(searchParams.get("designers")),
    priceMin: searchParams.get("priceMin") ?? "",
    priceMax: searchParams.get("priceMax") ?? "",
    hasFilm: searchParams.get("hasFilm") === "true",
    page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
  }), [defaultSort, query, searchParams]);

  const activeCount = values.categories.length + values.designers.length + Number(Boolean(values.priceMin || values.priceMax)) + Number(values.hasFilm) + Number(Boolean(values.q));
  const reset = useCallback(() => {
    setSearch("");
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { values, search, setSearch, setParams, activeCount, reset, queryString: searchParams.toString() };
}

function split(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}
