"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Card, EmptyState, ErrorState, formatPrice } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ProductCard } from "../../../../components/ProductCard";

type WishlistItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  designer: { displayName: string; handle: string };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.get<WishlistItem[]>("/customer/wishlist"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load wishlist");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(listingId: string) {
    await api.delete(`/customer/wishlist/${listingId}`);
    setItems((current) => current.filter((item) => item.id !== listingId));
  }

  if (loading) return <p className="text-brand-muted">Loading wishlist...</p>;
  if (error) return <ErrorState title="Wishlist unavailable" description={error} retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Wishlist</h1>
      {items.length === 0 ? (
        <Card>
          <div className="p-1">
            <EmptyState
              title="Your wishlist is empty"
              description="Save items you love by tapping the heart on any product."
              action={<Link href="/shop"><Button variant="primaryBlue">Browse shop</Button></Link>}
            />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="space-y-3">
              <ProductCard
                href={`/product/${item.slug}`}
                title={item.title}
                price={item.price}
                imageUrl={item.imageUrl ?? undefined}
                designer={{ displayName: item.designer.displayName, handle: item.designer.handle }}
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-brand-muted">{formatPrice(item.price)}</span>
                <button type="button" className="text-sm font-semibold text-brand-peach" onClick={() => void removeItem(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
