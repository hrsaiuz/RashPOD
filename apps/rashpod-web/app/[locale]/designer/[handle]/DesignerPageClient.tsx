"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, EmptyState, ErrorState, Skeleton, getApiBase } from "@rashpod/ui";
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


export default function DesignerPageClient({
  handle,
  initialDesigner = null,
  initialListings = [],
}: {
  handle: string;
  initialDesigner?: Designer | null;
  initialListings?: Listing[];
}) {
  const apiBase = getApiBase();

  const [designer, setDesigner] = useState<Designer | null>(initialDesigner);
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [loading, setLoading] = useState(!initialDesigner);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialDesigner) return;

    const fetchDesigner = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(`${apiBase}/shop/designers/${encodeURIComponent(handle)}`);

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
  }, [handle, apiBase, initialDesigner]);

  if (loading) {
    return (
      <div className="mx-auto max-w-storefront px-5 py-10">
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
      <div className="mx-auto max-w-storefront px-5 py-20">
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
  const bioParagraphs = designer.bio?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <div className="bg-brand-bg pb-16 text-black">
      <div className="mx-auto max-w-storefront px-5 pt-6">
        <nav className="flex items-center gap-5 text-[15px] text-brand-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-blue">Home</Link>
          <ChevronRight size={18} strokeWidth={1.6} />
          <Link href="/designers" className="hover:text-brand-blue">Designers</Link>
          <ChevronRight size={18} strokeWidth={1.6} />
          <span className="font-semibold text-brand-ink">Profile</span>
        </nav>

        <h1 className="mt-14 text-[20px] font-extrabold text-black">{designer.displayName}'s Profile</h1>

        <section className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.48fr_0.52fr]">
          <div className="flex justify-center">
            <DesignerPortraitFrame name={designer.displayName} imageUrl={portraitUrl} />
          </div>

          <div className="mx-auto max-w-[520px]">
            {bioParagraphs.length > 0 ? (
              <div className="space-y-4 text-[15px] leading-[1.15] text-black">
                {bioParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <EmptyState title="No bio yet" description="This designer hasn't added a profile bio yet." />
            )}
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
  const frameUrl = "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1779312255419-Group-1000001848.svg";

  return (
    <div className="relative h-[395px] w-[350px] overflow-hidden rounded-[16px]">
      <div className="absolute inset-[28px] overflow-hidden bg-brand-bg">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="350px" className="z-10 object-cover object-bottom grayscale" priority />
        ) : (
          <div className="relative z-10 flex h-full w-full items-center justify-center text-[96px] font-black uppercase text-brand-blue">
            {name.charAt(0)}
          </div>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frameUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain" />
    </div>
  );
}

function DesignerProductCard({ listing, index }: { listing: Listing; index: number }) {
  return (
    <Link href={`/product/${listing.slug}`} className="group rounded-[14px] bg-white p-5">
      <article>
        <div className="relative h-[245px] overflow-hidden rounded-[25px] bg-brand-bg">
          <span className="absolute left-5 top-5 z-10 rounded-[7px] bg-badge-bestSeller px-3 py-2 text-[8px] font-bold text-white">Best Seller</span>
          {listing.imageUrl ? (
            <Image src={listing.imageUrl} alt={listing.title} fill sizes="260px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <ProductFallback dark={index % 2 === 1} />
          )}
        </div>
        <h3 className="mt-4 text-[14px] font-extrabold text-black">{listing.title}</h3>
        <p className="mt-2 text-[10px] text-brand-subtle">Designed by {listing.designer.displayName}</p>
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
    <div className={`absolute inset-0 ${dark ? "bg-brand-ink" : "bg-white"}`} aria-hidden="true">
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
