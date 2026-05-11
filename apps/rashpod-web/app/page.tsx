"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  UploadCloud, CheckCircle, DollarSign,
  ShoppingBag, Paintbrush, Package,
  ArrowRight, ChevronDown,
} from "lucide-react";
import {
  Button,
  Card,
  Skeleton,
  EmptyState,
  ErrorState,
  KpiTile,
  ProductCard,
  CategoryTile,
  getDashboardUrl,
  getApiBase,
} from "@rashpod/ui";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

interface ProductListing {
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

interface Designer {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  listingsCount: number;
}

export default function HomePage() {
  const dashboardUrl = getDashboardUrl();
  const apiBase = getApiBase();

  const [products, setProducts] = useState<ProductListing[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [designersLoading, setDesignersLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [designersError, setDesignersError] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/shop/listings?limit=8`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.items || data);
        setProductsLoading(false);
      })
      .catch(() => {
        setProductsError(true);
        setProductsLoading(false);
      });

    fetch(`${apiBase}/shop/designers?limit=6`)
      .then((res) => {
        if (res.status === 404) {
          // TODO: Endpoint not implemented yet - using fallback
          setDesigners([
            { id: "1", handle: "artist1", displayName: "Artist One", listingsCount: 12 },
            { id: "2", handle: "artist2", displayName: "Artist Two", listingsCount: 8 },
            { id: "3", handle: "artist3", displayName: "Artist Three", listingsCount: 15 },
          ]);
          setDesignersLoading(false);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setDesigners(data.items || data);
          setDesignersLoading(false);
        }
      })
      .catch(() => {
        setDesignersError(true);
        setDesignersLoading(false);
      });
  }, [apiBase]);

  const retryProducts = () => {
    setProductsError(false);
    setProductsLoading(true);
    fetch(`${apiBase}/shop/listings?limit=8`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.items || data);
        setProductsLoading(false);
      })
      .catch(() => {
        setProductsError(true);
        setProductsLoading(false);
      });
  };

  const retryDesigners = () => {
    setDesignersError(false);
    setDesignersLoading(true);
    fetch(`${apiBase}/shop/designers?limit=6`)
      .then((res) => res.json())
      .then((data) => {
        setDesigners(data.items || data);
        setDesignersLoading(false);
      })
      .catch(() => {
        setDesignersError(true);
        setDesignersLoading(false);
      });
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #F0F2FA 0%, #FFFFFF 55%, #FFD6C6 100%)",
        }}
      >
        {/* Decorative floating shapes — pointer-events-none, low opacity */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute -top-16 -right-10 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #F39E7C 0%, transparent 70%)" }}
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 -left-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #788AE0 0%, transparent 70%)" }}
            animate={{ y: [0, -25, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 py-20 md:py-28">
          <motion.div {...fadeIn} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-blue ring-1 ring-brand-blueLight mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-peach" aria-hidden="true" />
              Print-on-Demand for Uzbekistan
            </span>
            <h1 className="text-[clamp(36px,5vw,56px)] font-bold leading-[1.05] tracking-tight text-brand-ink mb-6">
              Upload your designs.<br />
              <span className="text-brand-blue">Sell products.</span>{" "}
              <span className="text-brand-peach">Earn royalties.</span>
            </h1>
            <p className="text-lg md:text-xl text-brand-muted mb-10 leading-relaxed max-w-[560px]">
              Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate
              merchandise opportunities.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href={`${dashboardUrl}/auth/register?role=designer`}>
                <Button variant="primaryPeach" size="lg">
                  Start selling your designs
                </Button>
              </a>
              <Link href="/shop">
                <Button variant="primaryBlue" size="lg">
                  Open RashPOD Shop
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works for designers */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-brand-ink mb-12 text-center"
        >
          How it works for designers
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              number: "1",
              icon: <UploadCloud className="w-8 h-8 text-brand-blue" />,
              title: "Upload your design",
              desc: "Upload your artwork once. We apply it to multiple product types automatically.",
            },
            {
              number: "2",
              icon: <CheckCircle className="w-8 h-8 text-brand-blue" />,
              title: "Get approved",
              desc: "Our team reviews your design for quality and commercial viability. Approval takes 24-48 hours.",
            },
            {
              number: "3",
              icon: <DollarSign className="w-8 h-8 text-brand-blue" />,
              title: "Earn royalties",
              desc: "Every time a customer buys a product with your design, you earn a royalty. Track earnings in your dashboard.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.28 }}
            >
              <Card variant="lift" className="p-8 h-full">
                <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mb-6 text-2xl font-bold text-brand-blue">
                  {step.number}
                </div>
                <div className="mb-4">{step.icon}</div>
                <h3 className="text-xl font-semibold text-brand-ink mb-3">{step.title}</h3>
                <p className="text-brand-muted leading-relaxed">{step.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works for customers */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-brand-ink mb-12 text-center"
        >
          How it works for customers
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              number: "1",
              icon: <ShoppingBag className="w-8 h-8 text-brand-peach" />,
              title: "Browse designs",
              desc: "Explore thousands of unique designs from talented designers across Uzbekistan.",
            },
            {
              number: "2",
              icon: <Paintbrush className="w-8 h-8 text-brand-peach" />,
              title: "Customize your product",
              desc: "Choose your size, color, and quantity. Preview exactly what you'll receive.",
            },
            {
              number: "3",
              icon: <Package className="w-8 h-8 text-brand-peach" />,
              title: "Receive quality products",
              desc: "We print on-demand and ship directly to you. Track your order every step of the way.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.28 }}
            >
              <Card variant="lift" className="p-8 h-full">
                <div className="w-16 h-16 rounded-full bg-brand-peach/10 flex items-center justify-center mb-6 text-2xl font-bold text-brand-peach">
                  {step.number}
                </div>
                <div className="mb-4">{step.icon}</div>
                <h3 className="text-xl font-semibold text-brand-ink mb-3">{step.title}</h3>
                <p className="text-brand-muted leading-relaxed">{step.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink">Featured products</h2>
          <Link href="/shop">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        {productsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} variant="lift" className="!p-0 overflow-hidden">
                <Skeleton className="w-full h-64 rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {productsError && (
          <ErrorState
            title="Failed to load products"
            description="We couldn't load featured products. Please try again."
            retry={
              <Button variant="primaryBlue" size="md" onClick={retryProducts}>
                Retry
              </Button>
            }
          />
        )}

        {!productsLoading && !productsError && products.length === 0 && (
          <EmptyState
            title="No products yet"
            description="Check back soon for featured products from our designers."
          />
        )}

        {!productsLoading && !productsError && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 rounded-[28px]"
                aria-label={`View ${product.title} by ${product.designer.displayName}`}
              >
                <ProductCard
                  title={product.title}
                  description={`by ${product.designer.displayName}`}
                  price={`$${Number(product.price).toFixed(2)}`}
                  imageUrl={product.imageUrl}
                />
              </Link>
            ))}
          </motion.div>
        )}
      </section>

      {/* Featured designers */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink">Featured designers</h2>
          <Link href="/designers">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        {designersLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} variant="lift" className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {designersError && (
          <ErrorState
            title="Failed to load designers"
            description="We couldn't load featured designers. Please try again."
            retry={
              <Button variant="primaryBlue" size="md" onClick={retryDesigners}>
                Retry
              </Button>
            }
          />
        )}

        {!designersLoading && !designersError && designers.length === 0 && (
          <EmptyState
            title="No designers yet"
            description="Check back soon for featured designers."
          />
        )}

        {!designersLoading && !designersError && designers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {designers.map((designer) => (
              <Card key={designer.id} variant="lift" className="p-6 group">
                <Link
                  href={`/designer/${designer.handle}`}
                  className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 rounded-xl"
                  aria-label={`View ${designer.displayName}'s profile`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center overflow-hidden">
                      {designer.avatarUrl ? (
                        <Image
                          src={designer.avatarUrl}
                          alt=""
                          width={64}
                          height={64}
                          className="rounded-full"
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
                  <p className="text-sm text-brand-muted tabular-nums">
                    {designer.listingsCount} {designer.listingsCount === 1 ? "listing" : "listings"}
                  </p>
                </Link>
              </Card>
            ))}
          </motion.div>
        )}
      </section>

      {/* Films + Corporate as CategoryTile pair */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/film"
            className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-peach/30 rounded-[24px]"
            aria-label="Browse DTF and UV-DTF films"
          >
            <CategoryTile
              variant="peach"
              category="For print shops"
              title="DTF & UV-DTF Films"
            />
          </Link>
          <Link
            href="/corporate"
            className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 rounded-[24px]"
            aria-label="Request a corporate quote"
          >
            <CategoryTile
              variant="blue"
              category="For companies"
              title="Bulk merchandise"
            />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-brand-muted">
          <p className="leading-relaxed">
            Print shops: browse our film catalog and license high-quality designs.
            Designers retain rights while earning royalties on every license.
          </p>
          <p className="leading-relaxed">
            Need custom merchandise for your team or event? Get a quote for branded
            products, uniforms or event giveaways.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {/* TODO: Replace with real KPIs from API */}
          <KpiTile label="Designers onboarded" value="120+" />
          <KpiTile label="Designs sold" value="3,500+" />
          <KpiTile label="Cities served" value="15+" />
          <KpiTile label="On-time delivery" value="98%" />
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-brand-ink mb-12 text-center"
        >
          What our community says
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TODO: Replace with real testimonials */}
          {[
            {
              name: "Sardor K.",
              role: "Designer",
              accent: "peach" as const,
              quote: "RashPOD made it so easy to monetize my designs. I upload once and earn royalties every month.",
            },
            {
              name: "Nilufar A.",
              role: "Customer",
              accent: "blue" as const,
              quote: "I love the unique designs and the quality of the products. Fast shipping too.",
            },
            {
              name: "Bekzod M.",
              role: "Print shop owner",
              accent: "peach" as const,
              quote: "The film licensing system is brilliant. I can access professional designs legally and efficiently.",
            },
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.28 }}
            >
              <Card className="p-6 h-full flex flex-col">
                <p className="text-brand-ink leading-relaxed mb-6 flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      testimonial.accent === "peach"
                        ? "bg-brand-peachLight text-brand-peach"
                        : "bg-brand-blueLight text-brand-blue"
                    }`}
                    aria-hidden="true"
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-brand-ink leading-tight">{testimonial.name}</p>
                    <p className="text-xs text-brand-muted">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-brand-ink mb-12 text-center"
        >
          Frequently asked questions
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto space-y-4"
        >
          {[
            {
              question: "How do royalties work for designers?",
              answer:
                "Designers earn a royalty on every product sold featuring their design. The royalty rate is set by the platform admin and paid out monthly. You can track your earnings in your designer dashboard.",
            },
            {
              question: "What file types do you accept?",
              answer:
                "We accept PNG, JPEG, SVG, and AI files. For best results, upload high-resolution files (at least 300 DPI) with transparent backgrounds where appropriate.",
            },
            {
              question: "How long does shipping take?",
              answer:
                "Standard shipping within Uzbekistan takes 3-7 business days. Express shipping is available for faster delivery. Shipping times are calculated at checkout.",
            },
            {
              question: "What is your return policy?",
              answer:
                "We accept returns within 14 days of delivery for defective or damaged items. Custom-printed products cannot be returned unless they arrive damaged or with printing defects.",
            },
            {
              question: "How do I become a designer?",
              answer:
                "Click 'Start selling' in the header, register as a designer, and upload your first design. Our team will review it within 24-48 hours. Once approved, your designs will be available for sale.",
            },
          ].map((faq, i) => (
            <details
              key={i}
              className="group bg-white rounded-[24px] p-6 shadow-sm border border-surface-borderSoft"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded">
                <span className="font-semibold text-brand-ink">{faq.question}</span>
                <ChevronDown className="w-5 h-5 text-brand-muted group-open:rotate-180 transition-transform" aria-hidden="true" />
              </summary>
              <p className="mt-4 text-brand-muted leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
