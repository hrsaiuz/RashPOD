"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, ErrorState, Skeleton, getApiBase } from "@rashpod/ui";
import { ChevronRight, Package } from "lucide-react";

interface Designer {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  joinedAt: string;
  stats: {
    listingsCount: number;
    salesCount?: number;
    followersCount?: number;
  };
}

interface Listing {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  designer: {
    displayName: string;
    handle: string;
  };
}

const fallbackBio = [
  "Hi, I'm a RashPOD designer with a strong interest in fashion, culture, and visual storytelling. I love creating designs that feel meaningful, wearable, and connected to real emotions.",
  "My work is inspired by everyday life, local culture, vintage details, and modern streetwear. I enjoy combining simple compositions with strong ideas, so each design can tell a small story on a T-shirt.",
  "For me, RASHPOD is a great place to share my creativity with more people and turn digital designs into real products. I'm excited to create pieces that people can wear with confidence, personality, and a sense of connection.",
];

export default function DesignerProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const apiBase = getApiBase();

  const [designer, setDesigner] = useState<Designer | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDesigner = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(`${apiBase}/shop/designers/${encodeURIComponent(handle)}`, {
          next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error("Designer not found");

        const data = await res.json();
        setDesigner(data.designer || data);
        setListings(data.listings || []);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    void fetchDesigner();
  }, [handle, apiBase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1232px] px-5 py-10">
        <Skeleton className="mb-8 h-6 w-48" />
        <Skeleton className="mb-12 h-[430px] w-full" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[360px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !designer) {
    return (
      <div className="mx-auto max-w-[1232px] px-5 py-20">
        <ErrorState
          title="Designer not found"
          description="We couldn't find the designer you're looking for."
          retry={
            <Link href="/designers">
              <Button variant="primaryBlue" size="md">
                Browse designers
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const portraitUrl = designer.avatarUrl ?? designer.coverUrl;
  const bioParagraphs = designer.bio
    ? designer.bio.split(/\n{2,}/).filter(Boolean).slice(0, 3)
    : fallbackBio;

  return (
    <div className="bg-brand-bg pb-16 text-black">
      <div className="mx-auto max-w-[1232px] px-5 pt-6">
        <nav className="flex items-center gap-5 text-[15px] text-[#4F5360]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-blue">Home</Link>
          <ChevronRight size={18} strokeWidth={1.6} />
          <Link href="/designers" className="hover:text-brand-blue">Designers</Link>
          <ChevronRight size={18} strokeWidth={1.6} />
          <span className="font-semibold text-[#1C2030]">Profile</span>
        </nav>

        <h1 className="mt-14 text-[20px] font-extrabold text-black">{designer.displayName}'s SDY A2LKDNVA</h1>

        <section className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.48fr_0.52fr]">
          <div className="flex justify-center">
            <DesignerPortraitFrame name={designer.displayName} imageUrl={portraitUrl} />
          </div>

          <div className="mx-auto max-w-[520px]">
            <div className="space-y-4 text-[15px] leading-[1.15] text-black">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <Link
              href={`/designer/${designer.handle}#portfolio`}
              className="mt-16 inline-flex h-[48px] min-w-[190px] items-center justify-center rounded-[12px] bg-brand-blue px-8 text-[15px] font-bold uppercase tracking-[0.02em] text-white transition-transform hover:scale-[1.02]"
            >
              Portfolio
            </Link>
          </div>
        </section>

        <section id="portfolio" className="mt-24">
          <h2 className="mb-6 text-[20px] font-extrabold text-black">{designer.displayName}'s Designs</h2>

          {listings.length === 0 ? (
            <div className="rounded-[18px] bg-white p-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-bg">
                <Package className="h-10 w-10 text-brand-muted" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-brand-ink">No listings yet</h3>
              <p className="text-brand-muted">This designer hasn't published any products yet. Check back soon.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {listings.slice(0, 4).map((listing, index) => (
                <DesignerProductCard key={listing.id} listing={listing} index={index} />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

function DesignerPortraitFrame({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <div className="relative h-[395px] w-[350px] overflow-hidden rounded-[16px] bg-brand-peach p-[28px]">
      <div className="absolute inset-[8px] opacity-90" aria-hidden="true">
        {Array.from({ length: 44 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-[22px] w-[22px] rotate-45 bg-brand-blue"
            style={{
              left: `${(index % 11) * 30}px`,
              top: `${Math.floor(index / 11) * 92}px`,
            }}
          />
        ))}
      </div>
      <div className="relative h-full w-full overflow-hidden border border-brand-blueLight bg-[#EEF1FA]">
        <div className="absolute inset-0" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-[190px] w-[92px] origin-bottom rounded-t-full bg-brand-blueLight/70"
              style={{
                left: `${index * 38 - 45}px`,
                top: "-22px",
                transform: `rotate(${index % 2 === 0 ? 33 : -33}deg)`,
              }}
            />
          ))}
        </div>
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="350px" className="z-10 object-cover object-bottom grayscale" priority />
        ) : (
          <div className="relative z-10 flex h-full w-full items-center justify-center text-[96px] font-black uppercase text-brand-blue">
            {name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}

function DesignerProductCard({ listing, index }: { listing: Listing; index: number }) {
  return (
    <Link href={`/product/${listing.slug}`} className="group rounded-[14px] bg-white p-5">
      <article>
        <div className="relative h-[245px] overflow-hidden rounded-[25px] bg-[#EEF1FA]">
          <span className="absolute left-5 top-5 z-10 rounded-[7px] bg-[#D877CF] px-3 py-2 text-[8px] font-bold text-white">Best Seller</span>
          {listing.imageUrl ? (
            <Image src={listing.imageUrl} alt={listing.title} fill sizes="260px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <ProductFallback dark={index % 2 === 1} />
          )}
        </div>
        <h3 className="mt-4 text-[14px] font-extrabold text-black">{listing.title}</h3>
        <p className="mt-2 text-[10px] text-[#777]">Designed by {listing.designer.displayName}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] font-black text-black">{formatPrice(listing.price)}</span>
          <span className="inline-flex h-[32px] items-center justify-center rounded-[8px] bg-brand-peach px-4 text-[10px] font-bold text-white">See Product</span>
        </div>
      </article>
    </Link>
  );
}

function ProductFallback({ dark }: { dark?: boolean }) {
  return (
    <div className={`absolute inset-0 ${dark ? "bg-[#172217]" : "bg-white"}`} aria-hidden="true">
      <div className={`absolute left-1/2 top-0 h-[280px] w-[205px] -translate-x-1/2 rounded-b-[56px] ${dark ? "bg-black" : "bg-white"} shadow-[inset_0_0_34px_rgba(0,0,0,0.09)]`} />
      <div className="absolute left-1/2 top-[43%] h-[58px] w-[58px] -translate-x-1/2 rounded-[14px] border-[5px] border-brand-peach bg-brand-blueLight" />
    </div>
  );
}

function formatPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "20$";
  if (price < 1000) return `${price}$`;
  return `${Math.round(price / 10000)}$`;
}
