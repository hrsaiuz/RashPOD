import { CATALOG_REVALIDATE_SECONDS } from "./cache";

const getOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

export interface ProductListing {
  id: string;
  slug: string;
  title: string;
  designer: string;
  designerHandle?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  description?: string;
}

export interface DesignerSummary {
  id: string;
  handle: string;
  displayName: string;
  listingsCount: number;
  avatarUrl?: string;
  profileImageUrl?: string;
  location?: string;
  bio?: string;
  topListings?: Array<{ id: string; imageUrl?: string }>;
}

export interface FilmListing {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  images?: string[];
  designer: { displayName: string; handle: string };
}

export interface StoryListingSummary {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  designer?: { displayName?: string | null; handle?: string | null };
}

export interface PublicDesignStory {
  id: string;
  slug: string;
  title: string;
  body: string;
  locale: string;
  sourceLocale: string;
  fallbackUsed: boolean;
  publicUrl: string;
  qrCodeImageUrl?: string | null;
  coverImageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  publishedAt?: string | null;
  designer?: { id?: string; displayName?: string | null; handle?: string | null } | null;
  design?: { id?: string; title?: string | null } | null;
  listings: StoryListingSummary[];
}

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";
}

export function normalizeProducts(data: unknown): ProductListing[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown })?.items)
      ? (data as { items: unknown[] }).items
      : [];

  return rows
    .map((item: any) => ({
      id: String(item.id ?? ""),
      slug: String(item.slug ?? item.id ?? ""),
      title: String(item.title ?? "Product"),
      designer: String(item.designer?.displayName ?? item.designerName ?? "Designer"),
      designerHandle: getOptionalString(item.designer?.handle),
      price: Number(item.price ?? 0),
      imageUrl:
        getOptionalString(item.imageUrl) ??
        (Array.isArray(item.images) ? getOptionalString(item.images[0]) : undefined),
      category: getOptionalString(item.category) ?? getOptionalString(item.productType?.name),
      description: getOptionalString(item.description) ?? getOptionalString(item.shortDescription),
    }))
    .filter((item) => item.id && item.slug);
}

export function normalizeDesigners(data: unknown): DesignerSummary[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown })?.items)
      ? (data as { items: unknown[] }).items
      : [];

  return rows
    .map((item: any) => ({
      id: String(item.id ?? ""),
      handle: String(item.handle ?? item.id ?? ""),
      displayName: String(item.displayName ?? item.name ?? "Designer"),
      listingsCount: Number(item.listingsCount ?? item._count?.listings ?? 0),
      avatarUrl: getOptionalString(item.avatarUrl),
      profileImageUrl: getOptionalString(item.profileImageUrl) ?? getOptionalString(item.coverUrl),
      location: getOptionalString(item.city) ?? getOptionalString(item.location),
      bio: getOptionalString(item.bio) ?? getOptionalString(item.about),
      topListings: Array.isArray(item.topListings)
        ? item.topListings
            .map((listing: any) => ({
              id: String(listing.id ?? ""),
              imageUrl: getOptionalString(listing.imageUrl),
            }))
            .filter((listing: { id: string }) => listing.id)
        : undefined,
    }))
    .filter((designer) => designer.id && designer.handle && designer.displayName);
}

export function normalizeFilmListing(item: unknown): FilmListing | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const designer = row.designer as Record<string, unknown> | undefined;
  const id = String(row.id ?? "");
  const slug = String(row.slug ?? row.id ?? "");
  if (!id || !slug) return null;

  const images = Array.isArray(row.images)
    ? row.images.filter((value): value is string => typeof value === "string")
    : undefined;

  return {
    id,
    slug,
    title: String(row.title ?? "Film"),
    description: getOptionalString(row.description) ?? null,
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? "UZS"),
    imageUrl: getOptionalString(row.imageUrl) ?? images?.[0] ?? null,
    images,
    designer: {
      displayName: String(designer?.displayName ?? "Designer"),
      handle: String(designer?.handle ?? ""),
    },
  };
}

export function normalizeFilmListings(data: unknown): FilmListing[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown })?.items)
      ? (data as { items: unknown[] }).items
      : [];

  return rows.map(normalizeFilmListing).filter((item): item is FilmListing => item !== null);
}

export async function fetchListings(params: Record<string, string> = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return [];

  const search = new URLSearchParams(params);
  const res = await fetch(`${apiUrl}/shop/listings?${search.toString()}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];
  return normalizeProducts(await res.json());
}

export async function fetchListingBySlug(slug: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const res = await fetch(`${apiUrl}/shop/listings/${slug}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  const products = normalizeProducts([await res.json()]);
  return products[0] ?? null;
}

export async function fetchDesigners(limit = 50) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return [];

  const res = await fetch(`${apiUrl}/shop/designers?limit=${limit}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];
  return normalizeDesigners(await res.json());
}

export async function fetchDesignerByHandle(handle: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const res = await fetch(`${apiUrl}/shop/designers/${encodeURIComponent(handle)}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const designer = data.designer || data;
  const listings = Array.isArray(data.listings) ? normalizeProducts(data.listings) : [];
  const normalized = normalizeDesigners([designer])[0];
  if (!normalized) return null;
  return { designer: { ...normalized, bio: getOptionalString(designer.bio) ?? getOptionalString(designer.about) }, listings };
}

export async function fetchProductDetail(slug: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const res = await fetch(`${apiUrl}/shop/listings/${encodeURIComponent(slug)}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchFilmListings(params: Record<string, string> = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return [];

  const search = new URLSearchParams({ type: "FILM", limit: "60", ...params });
  const res = await fetch(`${apiUrl}/shop/listings?${search.toString()}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];
  return normalizeFilmListings(await res.json());
}

export async function fetchFilmBySlug(slug: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const res = await fetch(`${apiUrl}/shop/listings/${encodeURIComponent(slug)}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  return normalizeFilmListing(await res.json());
}

export async function fetchShopListings(params: Record<string, string> = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return { items: [] as ProductListing[], meta: null as { total: number; page: number; perPage: number; totalPages: number } | null };

  const search = new URLSearchParams(params);
  const res = await fetch(`${apiUrl}/shop/listings?${search.toString()}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return { items: [], meta: null };

  const data = await res.json();
  const items = normalizeProducts(data);
  const meta = data.meta ?? null;
  return { items, meta };
}

export async function fetchStoryBySlug(slug: string, locale?: string) {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const res = await fetch(`${apiUrl}/shop/stories/${encodeURIComponent(slug)}${suffix}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  return (await res.json()) as PublicDesignStory;
}
