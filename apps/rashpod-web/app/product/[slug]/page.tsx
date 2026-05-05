"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, ProductCard } from "@rashpod/ui";
import { Star, CheckCircle, ChevronLeft, ChevronRight, Share2, Heart } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [listing, setListing] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_URL}/shop/listings/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        // Mock data if API fails or returns empty for UI demo
        if (!data) {
          setListing({
            id: "1", title: "Classic Black T-Shirt", type: "t-shirt", price: "71.56", currency: "UZS",
            description: "High quality, 100% cotton, perfect for vibrant DTF prints.",
            designerName: "shuwan"
          });
        } else {
          setListing(data);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!listing) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

  return (
    <main className="max-w-[1120px] mx-auto px-6 py-10">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-brand-muted mb-8 gap-2">
        <Link href="/" className="hover:text-brand-ink">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-brand-ink">Shop</Link>
        <span>/</span>
        <span className="text-brand-ink font-medium">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Left: Gallery */}
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-[4/5] bg-brand-bg rounded-[24px] overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center text-brand-muted text-6xl">🎨</div>
            <button className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-surface-app transition-colors">
              <ChevronLeft className="w-5 h-5 text-brand-ink" />
            </button>
            <button className="absolute top-1/2 right-4 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-surface-app transition-colors">
              <ChevronRight className="w-5 h-5 text-brand-ink" />
            </button>
          </div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-20 h-20 rounded-2xl bg-brand-bg border-2 border-transparent hover:border-brand-peach cursor-pointer transition-colors" />
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-brand-ink">{listing.title}</h1>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full border border-surface-border-soft flex items-center justify-center hover:bg-surface-app text-brand-ink transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full border border-surface-border-soft flex items-center justify-center hover:bg-surface-app text-brand-ink transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-brand-muted mb-6">designed by <span className="font-medium text-brand-ink">{listing.designerName || "RashPOD"}</span></p>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-surface-border-soft">
            <span className="text-[32px] font-bold text-brand-ink">{listing.price} {listing.currency}</span>
            <div className="flex items-center gap-1 bg-[#FFF5F1] text-brand-peach px-3 py-1 rounded-full text-sm font-semibold">
              <Star className="w-4 h-4 fill-current" /> 4.8
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-brand-ink mb-3">Choose a Color</h3>
            <div className="flex gap-3">
              {['#FFFFFF', '#A3AFE5', '#F39E7C', '#1A1D2E'].map((color, i) => (
                <button key={i} className={`w-11 h-11 rounded-full border-2 p-1 ${i === 0 ? 'border-brand-peach' : 'border-transparent'}`}>
                  <div className="w-full h-full rounded-full border border-surface-border-soft" style={{ backgroundColor: color }} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-brand-ink mb-3">Choose a Size</h3>
            <div className="flex flex-wrap gap-2">
              {['Small', 'Medium', 'Large', 'Extra Large', 'XXL'].map((size, i) => (
                <button key={size} className={`px-4 py-2 rounded-full text-sm font-semibold border ${i === 1 ? 'bg-[#EEF1FF] text-brand-blue border-transparent' : 'bg-white text-brand-ink border-surface-border-soft hover:bg-surface-app'}`}>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <div className="flex items-center bg-surface-app rounded-full h-14 px-2">
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-brand-ink text-xl">-</button>
              <span className="w-8 text-center font-semibold">1</span>
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-brand-ink text-xl">+</button>
            </div>
            <Button variant="primaryPeach" size="lg" className="flex-1">Add To Cart</Button>
          </div>

          <div className="flex flex-col gap-4 bg-surface-card rounded-[20px] border border-surface-border-soft p-5">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-brand-peach mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-ink text-sm">Free Delivery</h4>
                <p className="text-sm text-brand-muted">Available via Yandex in Tashkent</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border-soft pt-12 mb-16">
        <h2 className="text-2xl font-bold text-brand-ink mb-6">Product Description</h2>
        <p className="text-brand-muted leading-relaxed mb-8 max-w-3xl">
          {listing.description}
        </p>

        <h3 className="font-bold text-brand-ink mb-4">Benefits</h3>
        <ul className="flex flex-col gap-3 mb-12">
          {["Durable, easily cleanable material.", "High quality vibrant DTF print that doesn't fade.", "Comfortable fit for everyday wear.", "Designed locally in Uzbekistan."].map((benefit, i) => (
            <li key={i} className="flex items-center gap-3 text-brand-muted text-sm">
              <CheckCircle className="w-4 h-4 text-brand-blue" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-brand-ink mb-6">Similar Items You Might Also Like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {[1, 2, 3, 4].map(i => (
             <ProductCard 
               key={i}
               title="Related Product"
               description="t-shirt"
               price="65,000 UZS"
             />
           ))}
        </div>
      </div>
    </main>
  );
}
