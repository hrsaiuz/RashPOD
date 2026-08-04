import type { Metadata } from "next";
import { fetchListings, fetchProductDetail } from "../../../../lib/catalog";
import ProductPageClient from "./ProductPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = (await fetchProductDetail(slug, locale)) as { title?: string; description?: string; imageUrl?: string } | null;

  return {
    title: product?.title ?? "Product",
    description: product?.description ?? undefined,
    openGraph: product?.imageUrl ? { images: [{ url: product.imageUrl }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [product, relatedResult] = await Promise.all([
    fetchProductDetail(slug, locale),
    fetchListings({ limit: "5", locale, type: "PRODUCT" }),
  ]);

  const related = relatedResult
    .filter((item) => item.slug !== slug)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl,
      designer: { displayName: item.designer },
    }));

  return <ProductPageClient slug={slug} initialProduct={product} initialRelated={related} />;
}
