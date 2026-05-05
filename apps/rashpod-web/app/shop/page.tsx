"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryTile, ProductCard } from "@rashpod/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
type Listing = { id: string; slug: string; title: string; type: string; price: string; imageUrl?: string };

export default function ShopPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (term = "", sortBy = sort) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (sortBy) params.set("sort", sortBy);
      const res = await fetch(`${API_URL}/shop/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
      setItems(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, sort);
  };

  return (
    <main className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-brand-ink mb-2">RashPOD Shop</h1>
          <p className="text-brand-muted">Discover unique designs and high-quality prints.</p>
        </div>

        <form onSubmit={onSearch} className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings…"
              className="pl-9 pr-4 py-3 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-4 focus:ring-focus w-full md:w-[240px] transition-all"
            />
          </div>
          <div className="relative hidden md:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); void load(q, e.target.value); }}
              className="pl-9 pr-8 py-3 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-4 focus:ring-focus appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
          </div>
          <button type="submit" className="bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold shadow-sm hover:bg-brand-blue-second transition-colors">
            Search
          </button>
        </form>
      </div>

      {/* Categories Grid */}
      {!q && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <CategoryTile category="clothes" title="t-shirt" variant="blue" />
          <CategoryTile category="prints" title="postal card" variant="peach" />
          <CategoryTile category="ceramics" title="mug" variant="blue" />
        </div>
      )}

      {error && (
        <div className="bg-semantic-danger-bg border border-[#FECACA] rounded-xl p-4 mb-8 text-semantic-danger text-sm flex justify-between items-center">
          {error}
          <button onClick={() => void load(q)} className="font-semibold underline">Retry</button>
        </div>
      )}

      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-surface-border-soft rounded-[28px] p-[18px] animate-pulse"
              >
                <div className="w-full h-[220px] bg-brand-bg rounded-[22px] mb-4" />
                <div className="h-4 bg-brand-bg rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-brand-bg rounded-full w-1/2" />
              </motion.div>
            ))
          ) : items.length === 0 && !error ? (
            null
          ) : (
            items.map((l) => (
              <motion.div
                key={l.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Link href={`/product/${l.slug}`}>
                  <ProductCard
                    title={l.title}
                    description={l.type}
                    price={`${l.price} UZS`}
                    imageUrl={l.imageUrl}
                  />
                </Link>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-xl font-semibold text-brand-ink mb-2">No listings found</h2>
          <p className="text-brand-muted mb-6">We couldn't find any items matching your search.</p>
          {q && (
            <button
              onClick={() => { setQ(""); void load(""); }}
              className="text-brand-blue font-semibold hover:underline"
            >
              Clear search filters
            </button>
          )}
        </div>
      )}
    </main>
  );
}
