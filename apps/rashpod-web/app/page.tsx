"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  UploadCloud, CheckCircle, DollarSign,
  ShoppingBag, Paintbrush, Package,
  ArrowRight, ChevronDown, Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  KpiTile,
  ProductCard,
  CategoryTile,
  getDashboardUrl,
  getApiBase,
} from "@rashpod/ui";

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

interface ProductListing {
  id: string;
  slug: string;
  title: string;
  designer: string;
  price: number;
  imageUrl?: string;
}

interface Designer {
  id: string;
  handle: string;
  displayName: string;
  listingsCount: number;
  avatarUrl?: string;
}

// Curated fallback content (used until the API endpoints return data in the
// expected shape). TODO: Replace once GET /shop/listings + /shop/designers
// return ListingWithDesigner / DesignerSummary DTOs.
const FALLBACK_PRODUCTS: ProductListing[] = [
  { id: "p1", slug: "tashkent-skyline-tee", title: "Tashkent Skyline Tee", designer: "Sardor Karimov", price: 159000 },
  { id: "p2", slug: "chorsu-bazaar-hoodie", title: "Chorsu Bazaar Hoodie", designer: "Nilufar A.", price: 329000 },
  { id: "p3", slug: "samarkand-poster", title: "Samarkand Poster", designer: "Bekzod M.", price: 89000 },
  { id: "p4", slug: "uzbek-folk-mug", title: "Uzbek Folk Mug", designer: "Madina R.", price: 79000 },
  { id: "p5", slug: "registan-print-tee", title: "Registan Print Tee", designer: "Sardor Karimov", price: 159000 },
  { id: "p6", slug: "navruz-poster", title: "Navruz Celebration Poster", designer: "Madina R.", price: 99000 },
  { id: "p7", slug: "silk-road-hoodie", title: "Silk Road Hoodie", designer: "Bekzod M.", price: 339000 },
  { id: "p8", slug: "modern-uzbekistan-mug", title: "Modern Uzbekistan Mug", designer: "Nilufar A.", price: 79000 },
];

const FALLBACK_DESIGNERS: Designer[] = [
  { id: "d1", handle: "sardor", displayName: "Sardor Karimov", listingsCount: 24 },
  { id: "d2", handle: "nilufar", displayName: "Nilufar A.", listingsCount: 18 },
  { id: "d3", handle: "bekzod", displayName: "Bekzod M.", listingsCount: 31 },
  { id: "d4", handle: "madina", displayName: "Madina R.", listingsCount: 12 },
  { id: "d5", handle: "jasur", displayName: "Jasur T.", listingsCount: 9 },
  { id: "d6", handle: "kamila", displayName: "Kamila S.", listingsCount: 15 },
];

const formatPrice = (sum: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(sum) + " so'm";

export default function HomePage() {
  const dashboardUrl = getDashboardUrl();
  const apiBase = getApiBase();

  const [products, setProducts] = useState<ProductListing[]>(FALLBACK_PRODUCTS);
  const [designers, setDesigners] = useState<Designer[]>(FALLBACK_DESIGNERS);

  useEffect(() => {
    // Best-effort enhancement: try the API; keep curated fallback if the
    // shape doesn't match or the request fails. No error UI on the home page.
    const controller = new AbortController();
    fetch(`${apiBase}/shop/listings?limit=8`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const mapped: ProductListing[] = data
          .map((d: any) => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            designer: d.designer?.displayName ?? d.designerName ?? "RashPOD designer",
            price: Number(d.price),
            imageUrl: Array.isArray(d.mockupUrls) ? d.mockupUrls[0] : d.imageUrl,
          }))
          .filter((p) => p.id && p.title);
        if (mapped.length) setProducts(mapped.slice(0, 8));
      })
      .catch(() => {/* keep fallback */});
    return () => controller.abort();
  }, [apiBase]);

  return (
    <div className="relative">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #F0F2FA 0%, #FFFFFF 55%, #FFD6C6 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute -top-12 -right-8 h-56 w-56 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #F39E7C 0%, transparent 70%)" }}
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 -left-12 h-48 w-48 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #788AE0 0%, transparent 70%)" }}
            animate={{ y: [0, -18, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <motion.div {...fadeIn} className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-blue ring-1 ring-brand-blueLight mb-5">
              <Sparkles size={12} aria-hidden="true" />
              Print-on-Demand for Uzbekistan
            </span>
            <h1 className="text-[clamp(28px,4vw,42px)] font-bold leading-[1.1] tracking-tight text-brand-ink mb-4">
              Upload your designs.<br />
              <span className="text-brand-blue">Sell products.</span>{" "}
              <span className="text-brand-peach">Earn royalties.</span>
            </h1>
            <p className="text-[15px] md:text-base text-brand-muted mb-7 leading-relaxed max-w-[480px]">
              Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate
              merchandise opportunities — local production, transparent royalties.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`${dashboardUrl}/auth/register?role=designer`}>
                <Button variant="primaryPeach" size="md">
                  Start selling your designs
                </Button>
              </a>
              <Link href="/shop">
                <Button variant="primaryBlue" size="md">
                  Open RashPOD Shop
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works (designers + customers, combined into one section) */}
      <section className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Designers */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-2">
              For designers
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-ink mb-6">
              Three steps to start earning
            </h2>
            <div className="space-y-3">
              {[
                { icon: <UploadCloud size={18} />, title: "Upload your design", desc: "Upload artwork once, we apply it across product types automatically." },
                { icon: <CheckCircle size={18} />, title: "Get approved", desc: "Our team reviews for quality and rights within 24–48 hours." },
                { icon: <DollarSign size={18} />, title: "Earn royalties", desc: "Track every sale and royalty payout from your dashboard." },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.05, duration: 0.24 }}
                >
                  <Card variant="flat" className="!p-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-brand-ink mb-0.5">{step.title}</h3>
                      <p className="text-[13px] text-brand-muted leading-relaxed">{step.desc}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Customers */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-blue mb-2">
              For customers
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-ink mb-6">
              Order made-to-order quality
            </h2>
            <div className="space-y-3">
              {[
                { icon: <ShoppingBag size={18} />, title: "Browse designs", desc: "Discover unique designs from talented designers across Uzbekistan." },
                { icon: <Paintbrush size={18} />, title: "Customize", desc: "Pick size, colour and quantity. Preview before you buy." },
                { icon: <Package size={18} />, title: "Get it delivered", desc: "Printed on-demand and shipped via Yandex or UzPost." },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.05, duration: 0.24 }}
                >
                  <Card variant="flat" className="!p-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-peachLight text-brand-peach">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-brand-ink mb-0.5">{step.title}</h3>
                      <p className="text-[13px] text-brand-muted leading-relaxed">{step.desc}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-blue mb-1">
              Shop
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-ink">Featured products</h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:gap-1.5 transition-[gap] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded-[20px]"
              aria-label={`View ${product.title} by ${product.designer}`}
            >
              <ProductCard
                title={product.title}
                description={`by ${product.designer}`}
                price={formatPrice(product.price)}
                imageUrl={product.imageUrl}
              />
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Featured designers */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-1">
              Talent
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-ink">Featured designers</h2>
          </div>
          <Link
            href="/designers"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:gap-1.5 transition-[gap] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {designers.map((designer) => (
            <Link
              key={designer.id}
              href={`/designer/${designer.handle}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded-2xl"
              aria-label={`View ${designer.displayName}'s profile`}
            >
              <Card variant="flat" className="!p-4 group hover:shadow-soft transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-brand-blueLight flex items-center justify-center overflow-hidden">
                    {designer.avatarUrl ? (
                      <Image src={designer.avatarUrl} alt="" width={48} height={48} className="rounded-full" />
                    ) : (
                      <span className="text-lg font-bold text-brand-blue">
                        {designer.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-brand-ink truncate group-hover:text-brand-blue transition-colors">
                      {designer.displayName}
                    </h3>
                    <p className="text-[12px] text-brand-muted">
                      @{designer.handle} · <span className="tabular-nums">{designer.listingsCount}</span> listings
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-brand-muted shrink-0 group-hover:text-brand-blue transition-colors" aria-hidden="true" />
                </div>
              </Card>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Films + Corporate */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/film"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-peach/30 rounded-[24px]"
            aria-label="Browse DTF and UV-DTF films"
          >
            <CategoryTile variant="peach" category="For print shops" title="DTF & UV-DTF Films" />
          </Link>
          <Link
            href="/corporate"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded-[24px]"
            aria-label="Request a corporate quote"
          >
            <CategoryTile variant="blue" category="For companies" title="Bulk merchandise" />
          </Link>
        </div>
      </section>

      {/* Trust KPIs */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {/* TODO: Replace with real KPIs from API */}
          <KpiTile label="Designers onboarded" value="120+" />
          <KpiTile label="Designs sold" value="3,500+" />
          <KpiTile label="Cities served" value="15+" />
          <KpiTile label="On-time delivery" value="98%" />
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-ink mb-6 text-center">
          What our community says
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TODO: Replace with real testimonials */}
          {[
            { name: "Sardor K.", role: "Designer", accent: "peach" as const, quote: "RashPOD made it easy to monetize my designs. Upload once, earn every month." },
            { name: "Nilufar A.", role: "Customer", accent: "blue" as const, quote: "Unique designs, great quality, and fast local shipping." },
            { name: "Bekzod M.", role: "Print shop", accent: "peach" as const, quote: "The film licensing system gives me legal access to professional designs." },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.24 }}
            >
              <Card variant="flat" className="!p-5 h-full flex flex-col">
                <p className="text-[14px] text-brand-ink leading-relaxed mb-4 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                      t.accent === "peach"
                        ? "bg-brand-peachLight text-brand-peach"
                        : "bg-brand-blueLight text-brand-blue"
                    }`}
                    aria-hidden="true"
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-ink leading-tight">{t.name}</p>
                    <p className="text-[11px] text-brand-muted">{t.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[840px] mx-auto px-6 py-12 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-ink mb-6 text-center">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {[
            { q: "How do royalties work for designers?", a: "Designers earn a royalty on every product sold featuring their design. The rate is set by the admin and paid monthly. Track everything in your designer dashboard." },
            { q: "What file types do you accept?", a: "PNG, JPEG, SVG, and AI files. For best results, upload high-resolution files (≥300 DPI) with transparent backgrounds where appropriate." },
            { q: "How long does shipping take?", a: "Standard shipping within Uzbekistan takes 3–7 business days; express is available. Shipping is calculated at checkout." },
            { q: "What is your return policy?", a: "We accept returns within 14 days for defective or damaged items. Custom-printed items can only be returned if defective." },
            { q: "How do I become a designer?", a: "Click ‘Start selling’, register as a designer, and upload your first design. Approval takes 24–48 hours." },
          ].map((faq, i) => (
            <details
              key={i}
              className="group bg-white rounded-2xl px-5 py-4 shadow-sm border border-surface-borderSoft"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded">
                <span className="text-[15px] font-semibold text-brand-ink pr-4">{faq.q}</span>
                <ChevronDown className="w-4 h-4 text-brand-muted group-open:rotate-180 transition-transform shrink-0" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-[14px] text-brand-muted leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
