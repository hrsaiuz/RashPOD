"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  UploadCloud, CheckCircle, DollarSign, 
  ShoppingBag, Paintbrush, Package,
  ArrowRight, ChevronDown
} from "lucide-react";
import {
  Button,
  Card,
  Skeleton,
  EmptyState,
  ErrorState,
  KpiTile,
  getDashboardUrl,
  getApiBase,
} from "@rashpod/ui";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
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
      <section className="max-w-[1120px] mx-auto px-6 py-24">
        <motion.div {...fadeIn} className="max-w-2xl">
          <h1 className="text-[clamp(36px,5vw,56px)] font-bold leading-[1.1] tracking-tight text-brand-ink mb-6">
            Upload your designs.<br />Sell products. Earn royalties.
          </h1>
          <p className="text-lg md:text-xl text-brand-muted mb-10 leading-relaxed max-w-[560px]">
            Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate merchandise opportunities.
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
      </section>

      {/* How it works for designers */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
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
              transition={{ delay: i * 0.1 }}
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
      <section className="max-w-[1120px] mx-auto px-6 py-16">
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
              transition={{ delay: i * 0.1 }}
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
      <section className="max-w-[1120px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-12"
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
              <Card key={i} variant="lift" className="overflow-hidden">
                <Skeleton className="w-full h-64" />
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
            message="We couldn't load featured products. Please try again."
            actionLabel="Retry"
            onAction={retryProducts}
          />
        )}

        {!productsLoading && !productsError && products.length === 0 && (
          <EmptyState
            title="No products yet"
            message="Check back soon for featured products from our designers."
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
              <Card key={product.id} variant="lift" className="overflow-hidden group">
                <Link href={`/product/${product.slug}`}>
                  <div className="relative w-full h-64 bg-gray-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-brand-ink mb-1 line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-brand-muted mb-2">by {product.designer.displayName}</p>
                    <p className="text-lg font-bold text-brand-blue">{product.price.toLocaleString()} UZS</p>
                  </div>
                </Link>
              </Card>
            ))}
          </motion.div>
        )}
      </section>

      {/* Featured designers */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-12"
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
            message="We couldn't load featured designers. Please try again."
            actionLabel="Retry"
            onAction={retryDesigners}
          />
        )}

        {!designersLoading && !designersError && designers.length === 0 && (
          <EmptyState
            title="No designers yet"
            message="Check back soon for featured designers."
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
                <Link href={`/designer/${designer.handle}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
                      {designer.avatarUrl ? (
                        <Image
                          src={designer.avatarUrl}
                          alt={designer.displayName}
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
                  <p className="text-sm text-brand-muted">
                    {designer.listingsCount} {designer.listingsCount === 1 ? "listing" : "listings"}
                  </p>
                </Link>
              </Card>
            ))}
          </motion.div>
        )}
      </section>

      {/* Films / DTF section */}
      <section className="bg-gradient-to-r from-brand-peach/10 to-brand-peach/5 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-[1120px] mx-auto px-6 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink mb-6">
            License designs for DTF/UV-DTF printing
          </h2>
          <p className="text-lg text-brand-muted mb-8 max-w-2xl mx-auto">
            Print shops: browse our film catalog and license high-quality designs for your printing business.
            Designers retain rights while earning royalties on every license.
          </p>
          <Link href="/film">
            <Button variant="primaryPeach" size="lg">
              Browse Films
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Corporate CTA */}
      <section className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-[1120px] mx-auto px-6 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink mb-6">
            Need bulk merchandise for your team or event?
          </h2>
          <p className="text-lg text-brand-muted mb-8 max-w-2xl mx-auto">
            We offer custom corporate merchandise solutions. Get a quote for branded products, team uniforms, or event giveaways.
          </p>
          <Link href="/corporate">
            <Button variant="primaryBlue" size="lg">
              Request a quote
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Trust signals */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* TODO: Replace with real KPIs from API */}
          <KpiTile label="Designers onboarded" value="120+" variant="blue" />
          <KpiTile label="Designs sold" value="3,500+" variant="peach" />
          <KpiTile label="Cities served" value="15+" variant="blue" />
          <KpiTile label="On-time delivery" value="98%" variant="peach" />
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
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
              quote: "RashPOD made it so easy to monetize my designs. I upload once and earn royalties every month!",
            },
            {
              name: "Nilufar A.",
              role: "Customer",
              quote: "I love the unique designs and the quality of the products. Fast shipping too!",
            },
            {
              name: "Bekzod M.",
              role: "Print Shop Owner",
              quote: "The film licensing system is brilliant. I can access professional designs legally and efficiently.",
            },
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 h-full">
                <p className="text-brand-muted italic mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-brand-ink">{testimonial.name}</p>
                  <p className="text-sm text-brand-muted">{testimonial.role}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
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
              className="group bg-white rounded-[24px] p-6 shadow-sm border border-surface-border-soft"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-brand-ink">{faq.question}</span>
                <ChevronDown className="w-5 h-5 text-brand-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-4 text-brand-muted leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
