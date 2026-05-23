import type { Metadata } from "next";
import { fetchDesigners, fetchShopListings } from "../../../lib/catalog";
import ShopPageClient from "./ShopPageClient";

export const metadata: Metadata = {
  title: "Shop",
  description: "Discover unique RashPOD products and film-ready designs from local creators.",
};

function buildListingParams(searchParams: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    limit: "24",
    page: get("page") ?? "1",
    sort: get("sort") ?? "newest",
    ...(get("categories") ? { categories: get("categories")! } : {}),
    ...(get("priceMin") ? { priceMin: get("priceMin")! } : {}),
    ...(get("priceMax") ? { priceMax: get("priceMax")! } : {}),
    ...(get("designers") ? { designers: get("designers")! } : {}),
    ...(get("hasFilm") === "true" ? { hasFilm: "true" } : {}),
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const listingParams = buildListingParams(params);

  const [{ items, meta }, designers] = await Promise.all([
    fetchShopListings(listingParams),
    fetchDesigners(50),
  ]);

  const initialListings = items.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    price: item.price,
    imageUrl: item.imageUrl,
    designer: {
      displayName: item.designer,
      handle: item.designerHandle ?? "",
    },
    category: item.category,
  }));

  return (
    <ShopPageClient
      initialListings={initialListings}
      initialMeta={meta}
      initialDesigners={designers.map((designer) => ({
        handle: designer.handle,
        displayName: designer.displayName,
      }))}
    />
  );
}
