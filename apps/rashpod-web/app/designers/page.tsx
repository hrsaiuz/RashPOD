"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Card,
  Skeleton,
  EmptyState,
  ErrorState,
  Button,
  getApiBase,
} from "@rashpod/ui";
import { Users } from "lucide-react";

interface Designer {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  listingsCount: number;
  topListings?: Array<{
    id: string;
    imageUrl?: string;
  }>;
}

export default function DesignersPage() {
  const apiBase = getApiBase();
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/shop/designers`, { next: { revalidate: 60 } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setDesigners(data.items || data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [apiBase]);

  const retry = () => {
    setError(false);
    setLoading(true);
    fetch(`${apiBase}/shop/designers`, { next: { revalidate: 60 } })
      .then((res) => res.json())
      .then((data) => {
        setDesigners(data.items || data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-brand-blue" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-brand-ink mb-4">
          Meet our designers
        </h1>
        <p className="text-lg text-brand-muted max-w-2xl mx-auto">
          Discover talented creators from across Uzbekistan. Browse their unique designs
          and support local artists.
        </p>
      </motion.div>

      {/* Designers grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <ErrorState
          title="Failed to load designers"
          description="We couldn't load the designer directory. Please try again."
          retry={
            <Button variant="primaryBlue" size="md" onClick={retry}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && designers.length === 0 && (
        <EmptyState
          title="No designers yet"
          description="Check back soon to discover talented creators."
        />
      )}

      {!loading && !error && designers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {designers.map((designer, i) => (
            <motion.div
              key={designer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card variant="lift" className="p-6 h-full group">
                <Link href={`/designer/${designer.handle}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center overflow-hidden">
                      {designer.avatarUrl ? (
                        <Image
                          src={designer.avatarUrl}
                          alt={designer.displayName}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-brand-blue">
                          {designer.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-brand-ink group-hover:text-brand-blue transition-colors">
                        {designer.displayName}
                      </h3>
                      <p className="text-sm text-brand-muted">@{designer.handle}</p>
                    </div>
                  </div>

                  {designer.bio && (
                    <p className="text-sm text-brand-muted mb-4 line-clamp-2">
                      {designer.bio}
                    </p>
                  )}

                  <p className="text-sm text-brand-muted mb-3">
                    {designer.listingsCount} {designer.listingsCount === 1 ? "listing" : "listings"}
                  </p>

                  {/* Top 3 thumbnail strip */}
                  {designer.topListings && designer.topListings.length > 0 && (
                    <div className="flex gap-2">
                      {designer.topListings.slice(0, 3).map((listing) => (
                        <div
                          key={listing.id}
                          className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden"
                        >
                          {listing.imageUrl ? (
                            <Image
                              src={listing.imageUrl}
                              alt=""
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-brand-bg" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

