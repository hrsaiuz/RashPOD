import { MetadataRoute } from "next";
import { getApiBase } from "@rashpod/ui";

async function getProductSlugs(): Promise<string[]> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/shop/listings?limit=1000`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || data;
    return items.map((item: { slug: string }) => item.slug);
  } catch (err) {
    console.warn("Failed to fetch product slugs for sitemap:", err);
    return [];
  }
}

async function getDesignerHandles(): Promise<string[]> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/shop/designers?limit=1000`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || data;
    return items.map((item: { handle: string }) => item.handle);
  } catch (err) {
    console.warn("Failed to fetch designer handles for sitemap:", err);
    return [];
  }
}

async function getFilmSlugs(): Promise<string[]> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/shop/films?limit=1000`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || data;
    return items.map((item: { slug: string }) => item.slug);
  } catch (err) {
    console.warn("Failed to fetch film slugs for sitemap:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";

  // Fetch dynamic slugs
  const [productSlugs, designerHandles, filmSlugs] = await Promise.all([
    getProductSlugs(),
    getDesignerHandles(),
    getFilmSlugs(),
  ]);

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/designers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/film`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/corporate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Product routes
  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${baseUrl}/product/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Designer routes
  const designerRoutes: MetadataRoute.Sitemap = designerHandles.map((handle) => ({
    url: `${baseUrl}/designer/${handle}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Film routes
  const filmRoutes: MetadataRoute.Sitemap = filmSlugs.map((slug) => ({
    url: `${baseUrl}/film/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...designerRoutes, ...filmRoutes];
}
