import type { Metadata } from "next";
import { fetchListings, fetchProductDetail } from "../../../../lib/catalog";
import ProductPageClient from "./ProductPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = (await fetchProductDetail(slug)) as { title?: string; description?: string; imageUrl?: string } | null;

  return {
    title: product?.title ?? "Product",
    description: product?.description ?? undefined,
    openGraph: product?.imageUrl ? { images: [{ url: product.imageUrl }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, relatedResult] = await Promise.all([
    fetchProductDetail(slug),
    fetchListings({ limit: "5" }),
  ]);

  const related = relatedResult
    .filter((item) => item.slug !== slug)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      price: item.price,
      imageUrl: item.imageUrl,
      designer: { displayName: item.designer },
    }));

  return <ProductPageClient slug={slug} initialProduct={product} initialRelated={related} />;
}
