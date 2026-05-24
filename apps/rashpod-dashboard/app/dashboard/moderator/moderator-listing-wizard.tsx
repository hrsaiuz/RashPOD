"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe2, Languages, Send, Sparkles } from "lucide-react";
import { Button, Card, Input, StatusBadge, Textarea } from "@rashpod/ui";
import { api, type Listing } from "../../../lib/api";

type LocaleKey = "en" | "uz" | "ru";

type LocaleCopy = {
  title: string;
  description: string;
  tags: string[];
};

type VariantRow = {
  id: string;
  color?: string;
  size?: string;
  price: string;
  enabled: boolean;
};

type ListingDetail = Listing & {
  designProductSelection?: {
    id: string;
    pipeline?: string;
    mockupAssets?: Array<{
      id: string;
      mockupType: string;
      status: string;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
    }>;
    localBaseProduct?: {
      name?: string;
      availableColors?: unknown;
      availableSizes?: unknown;
      defaultPrice?: string | number | null;
      currency?: string;
    } | null;
    printfulProductTemplate?: {
      displayName?: string;
      defaultRetailPrice?: string | number | null;
      currency?: string;
      allowedColorVariantIds?: unknown;
      allowedSizeVariantIds?: unknown;
    } | null;
  } | null;
};

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readTranslations(metadata: unknown): Partial<Record<LocaleKey, LocaleCopy>> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const translations = (metadata as Record<string, unknown>).translations;
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) return {};
  return translations as Partial<Record<LocaleKey, LocaleCopy>>;
}

function readVariants(metadata: unknown): VariantRow[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const variants = (metadata as Record<string, unknown>).variants;
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `variant-${index}`,
      color: typeof item.color === "string" ? item.color : undefined,
      size: typeof item.size === "string" ? item.size : undefined,
      price: item.price != null ? String(item.price) : "",
      enabled: item.enabled !== false,
    }));
}

function buildDefaultVariants(listing: ListingDetail): VariantRow[] {
  const existing = readVariants(listing.metadataJson);
  if (existing.length) return existing;

  const product = listing.designProductSelection?.localBaseProduct;
  const template = listing.designProductSelection?.printfulProductTemplate;
  const colors = normalizeStringArray(product?.availableColors ?? template?.allowedColorVariantIds);
  const sizes = normalizeStringArray(product?.availableSizes ?? template?.allowedSizeVariantIds);
  const defaultPrice = String(listing.price ?? product?.defaultPrice ?? template?.defaultRetailPrice ?? "");

  if (!colors.length && !sizes.length) {
    return [{ id: "default", price: defaultPrice, enabled: true }];
  }

  const rows: VariantRow[] = [];
  const colorList = colors.length ? colors : [undefined];
  const sizeList = sizes.length ? sizes : [undefined];
  for (const color of colorList) {
    for (const size of sizeList) {
      rows.push({
        id: `${color ?? "any"}-${size ?? "any"}`,
        color,
        size,
        price: defaultPrice,
        enabled: true,
      });
    }
  }
  return rows;
}

export function ModeratorListingWizard({
  listing,
  designTitle,
  onSaved,
}: {
  listing: ListingDetail;
  designTitle?: string;
  onSaved?: () => void;
}) {
  const initialTranslations = readTranslations(listing.metadataJson);
  const [activeLocale, setActiveLocale] = useState<LocaleKey>("en");
  const [translations, setTranslations] = useState<Record<LocaleKey, LocaleCopy>>({
    en: {
      title: initialTranslations.en?.title ?? listing.title,
      description: initialTranslations.en?.description ?? listing.description ?? "",
      tags: initialTranslations.en?.tags ?? normalizeStringArray((listing as { tags?: unknown }).tags),
    },
    uz: {
      title: initialTranslations.uz?.title ?? "",
      description: initialTranslations.uz?.description ?? "",
      tags: initialTranslations.uz?.tags ?? [],
    },
    ru: {
      title: initialTranslations.ru?.title ?? "",
      description: initialTranslations.ru?.description ?? "",
      tags: initialTranslations.ru?.tags ?? [],
    },
  });
  const [price, setPrice] = useState(String(listing.price ?? ""));
  const [variants, setVariants] = useState<VariantRow[]>(() => buildDefaultVariants(listing));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"" | LocaleKey>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mockups = listing.designProductSelection?.mockupAssets ?? [];
  const activeCopy = translations[activeLocale];

  const tagsText = useMemo(() => activeCopy.tags.join(", "), [activeCopy.tags]);

  function updateLocale(locale: LocaleKey, patch: Partial<LocaleCopy>) {
    setTranslations((current) => ({ ...current, [locale]: { ...current[locale], ...patch } }));
  }

  async function generateCopy(locale: LocaleKey) {
    setGenerating(locale);
    setError("");
    try {
      const response = await api.post<{ title?: string; description?: string; tags?: string[] }>("/ai/listing-copy", {
        titleHint: designTitle ?? translations.en.title,
        descriptionHint: translations.en.description,
        tagsHint: translations.en.tags,
        listingId: listing.id,
      });
      updateLocale(locale, {
        title: response.title ?? translations.en.title,
        description: response.description ?? translations.en.description,
        tags: response.tags ?? translations.en.tags,
      });
      setMessage(`Generated ${locale.toUpperCase()} listing copy. Review before saving.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI listing copy failed");
    } finally {
      setGenerating("");
    }
  }

  async function translateLocale(locale: LocaleKey) {
    setGenerating(locale);
    setError("");
    try {
      const source = translations.en;
      const [titleRes, descRes] = await Promise.all([
        source.title
          ? api.post<{ translatedText: string }>("/ai/translate", { text: source.title, targetLanguage: locale })
          : Promise.resolve({ translatedText: "" }),
        source.description
          ? api.post<{ translatedText: string }>("/ai/translate", { text: source.description, targetLanguage: locale })
          : Promise.resolve({ translatedText: "" }),
      ]);
      updateLocale(locale, {
        title: titleRes.translatedText || source.title,
        description: descRes.translatedText || source.description,
        tags: source.tags,
      });
      setMessage(`Translated to ${locale.toUpperCase()}. Review before saving.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setGenerating("");
    }
  }

  async function saveListing() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/listings/${listing.id}`, {
        title: translations.en.title,
        description: translations.en.description || null,
        price: Number(price),
        tags: translations.en.tags,
        metadataJson: {
          translations,
          variants: variants.filter((row) => row.enabled),
        },
      });
      setMessage("Listing saved.");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishListing() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/listings/${listing.id}`, {
        title: translations.en.title,
        description: translations.en.description || null,
        price: Number(price),
        tags: translations.en.tags,
        metadataJson: {
          translations,
          variants: variants.filter((row) => row.enabled),
        },
      });
      await api.post(`/admin/product-listings/${listing.id}/publish`);
      setMessage("Listing queued for publish.");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-ink">Listing Wizard</h3>
          <p className="mt-1 text-sm text-brand-muted">
            Create multilingual copy, set variations and price, then publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={listing.status} />
          <Link href={`/dashboard/moderator/listings/${listing.id}`} className="text-sm font-semibold text-brand-blue hover:underline">
            Open full editor
          </Link>
        </div>
      </div>

      {mockups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mockups.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-xl border border-surface-borderSoft bg-white">
              <div className="aspect-square flex items-center justify-center bg-brand-bg">
                {asset.imageUrl || asset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.imageUrl ?? asset.thumbnailUrl ?? ""}
                    alt={asset.mockupType}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="px-3 text-center text-xs text-brand-muted">{asset.status}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="text-xs font-semibold text-brand-ink">{asset.mockupType}</p>
                <StatusBadge status={asset.status} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["en", "uz", "ru"] as LocaleKey[]).map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveLocale(locale)}
            className={`rounded-pill px-3 py-1.5 text-xs font-semibold uppercase ${
              activeLocale === locale ? "bg-brand-blue text-white" : "border border-surface-borderSoft text-brand-ink"
            }`}
          >
            {locale}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => generateCopy(activeLocale)}
          disabled={!!generating || saving}
          loading={generating === activeLocale}
        >
          <Sparkles size={14} /> AI copy ({activeLocale.toUpperCase()})
        </Button>
        {activeLocale !== "en" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => translateLocale(activeLocale)}
            disabled={!!generating || saving}
            loading={generating === activeLocale}
          >
            <Languages size={14} /> Translate from EN
          </Button>
        ) : null}
      </div>

      <label className="block text-sm font-medium text-brand-ink">
        Title ({activeLocale.toUpperCase()})
        <Input
          value={activeCopy.title}
          onChange={(event) => updateLocale(activeLocale, { title: event.target.value })}
          className="mt-2"
        />
      </label>

      <label className="block text-sm font-medium text-brand-ink">
        Description ({activeLocale.toUpperCase()})
        <Textarea
          value={activeCopy.description}
          onChange={(event) => updateLocale(activeLocale, { description: event.target.value })}
          className="mt-2 min-h-28"
        />
      </label>

      <label className="block text-sm font-medium text-brand-ink">
        Tags ({activeLocale.toUpperCase()})
        <Input
          value={tagsText}
          onChange={(event) =>
            updateLocale(activeLocale, {
              tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
            })
          }
          className="mt-2"
          placeholder="comma, separated, tags"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-brand-ink">
          Base price ({listing.currency})
          <Input value={price} onChange={(event) => setPrice(event.target.value)} className="mt-2" type="number" min="0" step="0.01" />
        </label>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-brand-ink">Variations</h4>
        <div className="space-y-2">
          {variants.map((row, index) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-surface-borderSoft p-3 sm:grid-cols-[auto_1fr_1fr_120px] sm:items-center">
              <label className="flex items-center gap-2 text-sm text-brand-ink">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(event) =>
                    setVariants((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                      ),
                    )
                  }
                />
                Enable
              </label>
              <Input
                value={row.color ?? ""}
                onChange={(event) =>
                  setVariants((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, color: event.target.value || undefined } : item,
                    ),
                  )
                }
                placeholder="Color"
              />
              <Input
                value={row.size ?? ""}
                onChange={(event) =>
                  setVariants((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, size: event.target.value || undefined } : item,
                    ),
                  )
                }
                placeholder="Size"
              />
              <Input
                value={row.price}
                onChange={(event) =>
                  setVariants((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, price: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-status-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand-blue">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={saveListing} disabled={saving} loading={saving}>
          Save listing
        </Button>
        <Button variant="primaryPeach" onClick={publishListing} disabled={saving} loading={saving}>
          <Send size={16} /> Publish
        </Button>
        {listing.designProductSelection?.pipeline === "GLOBAL_PRINTFUL" ? (
          <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
            <Globe2 size={14} /> Global pipeline will queue marketplace publications
          </span>
        ) : null}
      </div>
    </Card>
  );
}
