"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Card,
  Button,
  KpiTile,
  Skeleton,
  ErrorState,
  Breadcrumbs,
  getApiBase,
} from "@rashpod/ui";
import { Calendar, Package } from "lucide-react";
import { ProductCard } from "../../../components/ProductCard";

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
      } catch (err) {
        setError(true);
        setLoading(false);
      }
    };

    fetchDesigner();
  }, [handle, apiBase]);

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-10">
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-64 w-full mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !designer) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-20">
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

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Designers", href: "/designers" },
    { label: designer.displayName, href: `/designer/${handle}` },
  ];

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="max-w-[1120px] mx-auto px-6 pt-10">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Cover band */}
      <div
        className="relative h-64 bg-gradient-to-r from-brand-blue to-brand-peach"
        style={
          designer.coverUrl
            ? {
                backgroundImage: `url(${designer.coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />

      {/* Profile section */}
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="relative -mt-20 mb-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 h-32 rounded-full bg-brand-blue/10 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
                {designer.avatarUrl ? (
                  <Image
                    src={designer.avatarUrl}
                    alt={designer.displayName}
                    width={128}
                    height={128}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-brand-blue">
                    {designer.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-brand-ink mb-2">
                  {designer.displayName}
                </h1>
                <p className="text-brand-muted mb-4">@{designer.handle}</p>
                {designer.bio && (
                  <p className="text-brand-muted leading-relaxed mb-4">{designer.bio}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-brand-muted">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(designer.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </div>
              </div>

              <Link href={`/film?designer=${handle}`}>
                <Button variant="primaryPeach" size="md">
                  License a film
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <KpiTile label="Listings" value={designer.stats.listingsCount} />
          {designer.stats.salesCount !== undefined && (
            <KpiTile label="Sales" value={designer.stats.salesCount} />
          )}
          {designer.stats.followersCount !== undefined && (
            <KpiTile label="Followers" value={designer.stats.followersCount} />
          )}
        </div>

        {/* Listings section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-brand-ink mb-8">All listings</h2>

          {listings.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-brand-ink mb-2">
                No listings yet
              </h3>
              <p className="text-brand-muted">
                This designer hasn't published any products yet. Check back soon!
              </p>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {listings.map((listing) => (
                <ProductCard key={listing.id} {...listing} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Film CTA card */}
        <Card className="p-8 bg-gradient-to-r from-brand-peach/10 to-brand-peach/5 border-brand-peach/20">
          <h3 className="text-xl font-bold text-brand-ink mb-2">
            License designs for printing
          </h3>
          <p className="text-brand-muted mb-6">
            Browse this designer's film catalog and license high-quality designs for your
            printing business.
          </p>
          <Link href={`/film?designer=${handle}`}>
            <Button variant="primaryPeach" size="md">
              Browse films
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

