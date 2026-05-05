"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Button,
  Card,
  Select,
  FormField,
  Skeleton,
  ErrorState,
  Breadcrumbs,
  getDashboardUrl,
  getApiBase,
} from "@rashpod/ui";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Package,
  Truck,
  Shield,
  ArrowLeft,
  X,
} from "lucide-react";
import { ProductCard } from "../../../components/ProductCard";

interface ProductDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  designer: {
    displayName: string;
    handle: string;
    avatarUrl?: string;
  };
  variants: {
    sizes: string[];
    colors: string[];
  };
  category: string;
  royaltyRate?: number;
  reviews?: {
    average: number;
    count: number;
  };
}

interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string;
  designer: {
    displayName: string;
    handle: string;
  };
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const apiBase = getApiBase();
  const dashboardUrl = getDashboardUrl();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "shipping" | "reviews" | "designer">("description");

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(`${apiBase}/shop/listings/${slug}`, {
          next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error("Product not found");

        const data = await res.json();
        setProduct(data);

        if (data.variants?.sizes?.length) setSelectedSize(data.variants.sizes[0]);
        if (data.variants?.colors?.length) setSelectedColor(data.variants.colors[0]);

        // Fetch related products
        const relatedRes = await fetch(`${apiBase}/shop/listings?category=${data.category}&limit=4`, {
          next: { revalidate: 60 },
        });
        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          setRelatedProducts((relatedData.items || relatedData).filter((p: RelatedProduct) => p.slug !== slug));
        }

        setLoading(false);
      } catch (err) {
        setError(true);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, apiBase]);

  const handleAddToCart = () => {
    // Since web has no auth, redirect to dashboard login with next param
    const checkoutUrl = encodeURIComponent(`/dashboard/customer/checkout?slug=${slug}&size=${selectedSize}&color=${selectedColor}&quantity=${quantity}`);
    window.location.href = `${dashboardUrl}/auth/login?next=${checkoutUrl}`;
  };

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-10">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="w-full aspect-[4/5]" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-20">
        <ErrorState
          title="Product not found"
          description="We couldn't find the product you're looking for."
          retry={
            <Link href="/shop">
              <Button variant="primaryBlue" size="md">
                Browse shop
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: product.title, href: `/product/${slug}` },
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      {/* Breadcrumbs */}
      <div className="mb-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Left: Image gallery */}
        <div>
          <div className="relative w-full aspect-[4/5] bg-gray-100 rounded-[24px] overflow-hidden mb-4">
            {product.images && product.images.length > 0 ? (
              <>
                <Image
                  src={product.images[currentImageIndex]}
                  alt={product.title}
                  fill
                  className="object-cover cursor-pointer"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  onClick={() => setFullscreenImage(true)}
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                      onClick={() =>
                        setCurrentImageIndex(
                          (currentImageIndex - 1 + product.images.length) % product.images.length
                        )
                      }
                    >
                      <ChevronLeft className="w-5 h-5 text-brand-ink" />
                    </button>
                    <button
                      className="absolute top-1/2 right-4 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                      onClick={() =>
                        setCurrentImageIndex((currentImageIndex + 1) % product.images.length)
                      }
                    >
                      <ChevronRight className="w-5 h-5 text-brand-ink" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-20 h-20" />
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    i === currentImageIndex ? "border-brand-blue" : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(i)}
                >
                  <Image
                    src={img}
                    alt={`${product.title} ${i + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-brand-ink">{product.title}</h1>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full border border-surface-border-soft flex items-center justify-center hover:bg-surface-app text-brand-ink transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full border border-surface-border-soft flex items-center justify-center hover:bg-surface-app text-brand-ink transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Link href={`/designer/${product.designer.handle}`} className="text-brand-muted hover:text-brand-blue">
              by <span className="font-medium">{product.designer.displayName}</span>
            </Link>
            {product.royaltyRate && (
              <span className="inline-flex items-center justify-center h-7 px-3 text-xs rounded-full font-medium bg-[#FFF1E8] text-[#C85F35]">
                {product.royaltyRate}% royalty to designer
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-surface-border-soft">
            <span className="text-[32px] font-bold text-brand-ink">
              {product.price.toLocaleString()} UZS
            </span>
            {product.reviews && (
              <div className="flex items-center gap-1 bg-[#FFF5F1] text-brand-peach px-3 py-1 rounded-full text-sm font-semibold">
                <Star className="w-4 h-4 fill-current" />
                {product.reviews.average} ({product.reviews.count})
              </div>
            )}
          </div>

          {/* Size selector */}
          {product.variants?.sizes && product.variants.sizes.length > 0 && (
            <div className="mb-6">
              <FormField label="Size">
                <Select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                  {product.variants.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          {/* Color selector */}
          {product.variants?.colors && product.variants.colors.length > 0 && (
            <div className="mb-6">
              <FormField label="Color">
                <Select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                  {product.variants.colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-8">
            <FormField label="Quantity">
              <div className="flex items-center bg-surface-app rounded-full h-14 px-2 w-fit">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-brand-ink text-xl font-semibold"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-brand-ink text-xl font-semibold"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </FormField>
          </div>

          <Button variant="primaryPeach" size="lg" className="mb-8" onClick={handleAddToCart}>
            Add To Cart
          </Button>

          <div className="space-y-4 bg-surface-card rounded-[20px] border border-surface-border-soft p-5">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-brand-blue mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-ink text-sm">Free Delivery</h4>
                <p className="text-sm text-brand-muted">3-7 business days within Uzbekistan</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand-blue mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-ink text-sm">Quality Guarantee</h4>
                <p className="text-sm text-brand-muted">14-day return for defective items</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-surface-border-soft pt-12 mb-16">
        <div className="flex gap-8 mb-8 border-b border-surface-border-soft">
          {[
            { id: "description", label: "Description" },
            { id: "shipping", label: "Shipping & Returns" },
            { id: "reviews", label: "Reviews" },
            { id: "designer", label: "Designer" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`pb-4 font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-brand-blue border-b-2 border-brand-blue"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="max-w-3xl">
            <p className="text-brand-muted leading-relaxed mb-6">{product.description}</p>
            <h3 className="font-bold text-brand-ink mb-4">Product Features</h3>
            <ul className="space-y-2">
              <li className="text-brand-muted text-sm">• High-quality printing with vibrant colors</li>
              <li className="text-brand-muted text-sm">• Durable materials for long-lasting use</li>
              <li className="text-brand-muted text-sm">• Designed by local Uzbek artists</li>
              <li className="text-brand-muted text-sm">• Supports creative community</li>
            </ul>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="max-w-3xl">
            <h3 className="font-bold text-brand-ink mb-4">Shipping</h3>
            <p className="text-brand-muted leading-relaxed mb-6">
              Standard shipping within Uzbekistan takes 3-7 business days. We partner with Yandex and UzPost
              for reliable delivery. Shipping is free for all orders.
            </p>
            <h3 className="font-bold text-brand-ink mb-4">Returns</h3>
            <p className="text-brand-muted leading-relaxed">
              We accept returns within 14 days of delivery for defective or damaged items. Custom-printed
              products cannot be returned unless they arrive damaged or with printing defects. Contact
              support to initiate a return.
            </p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="max-w-3xl">
            <p className="text-brand-muted">Reviews coming soon. Be the first to review this product!</p>
          </div>
        )}

        {activeTab === "designer" && (
          <Card className="max-w-3xl p-6">
            <Link href={`/designer/${product.designer.handle}`}>
              <div className="flex items-center gap-4 group">
                <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  {product.designer.avatarUrl ? (
                    <Image
                      src={product.designer.avatarUrl}
                      alt={product.designer.displayName}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-brand-blue">
                      {product.designer.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-ink group-hover:text-brand-blue transition-colors">
                    {product.designer.displayName}
                  </h3>
                  <p className="text-sm text-brand-muted">@{product.designer.handle}</p>
                </div>
                <Button variant="secondary" size="sm">
                  View profile
                </Button>
              </div>
            </Link>
          </Card>
        )}
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-brand-ink mb-8">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} {...related} />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen image modal */}
      {fullscreenImage && product.images && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
          onClick={() => setFullscreenImage(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            onClick={() => setFullscreenImage(false)}
          >
            <X className="w-5 h-5 text-brand-ink" />
          </button>
          <Image
            src={product.images[currentImageIndex]}
            alt={product.title}
            width={1200}
            height={1500}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

