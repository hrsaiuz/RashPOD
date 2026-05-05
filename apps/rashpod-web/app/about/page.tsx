"use client";

import { motion } from "framer-motion";
import { Button, Card, getDashboardUrl } from "@rashpod/ui";
import { Heart, Users, Zap, Shield } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const dashboardUrl = getDashboardUrl();

  return (
    <div className="relative">
      {/* Hero */}
      <section className="max-w-[1120px] mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-[clamp(36px,5vw,56px)] font-bold leading-[1.1] tracking-tight text-brand-ink mb-6">
            Empowering creators.<br />Connecting communities.
          </h1>
          <p className="text-lg md:text-xl text-brand-muted leading-relaxed">
            RashPOD is Uzbekistan's first platform that turns digital designs into physical products,
            enabling designers to earn royalties while customers discover unique, locally-created merchandise.
          </p>
        </motion.div>
      </section>

      {/* Mission */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-ink mb-6">Our mission</h2>
            <p className="text-brand-muted leading-relaxed mb-4">
              We believe every designer deserves a platform to monetize their creativity without manufacturing overhead.
              RashPOD handles production, fulfillment, and sales, so designers can focus on what they do best: creating.
            </p>
            <p className="text-brand-muted leading-relaxed">
              By connecting designers, customers, print shops, and businesses, we're building an ecosystem that
              celebrates local talent and makes unique merchandise accessible to everyone.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-brand-blue mb-2">120+</div>
              <p className="text-sm text-brand-muted">Designers</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-brand-peach mb-2">3,500+</div>
              <p className="text-sm text-brand-muted">Designs sold</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-brand-blue mb-2">15+</div>
              <p className="text-sm text-brand-muted">Cities served</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-brand-peach mb-2">98%</div>
              <p className="text-sm text-brand-muted">Satisfaction</p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-[1120px] mx-auto px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-brand-ink mb-12 text-center"
        >
          What we stand for
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Heart className="w-8 h-8 text-brand-blue" />,
              title: "Creator-first",
              desc: "Designers own their work. We're just the platform.",
            },
            {
              icon: <Users className="w-8 h-8 text-brand-peach" />,
              title: "Community-driven",
              desc: "Every stakeholder matters: designers, customers, print shops, businesses.",
            },
            {
              icon: <Zap className="w-8 h-8 text-brand-blue" />,
              title: "Automation",
              desc: "Technology handles the grunt work so people can be creative.",
            },
            {
              icon: <Shield className="w-8 h-8 text-brand-peach" />,
              title: "Rights & trust",
              desc: "Clear licensing, fair royalties, and transparent processes.",
            },
          ].map((value, i) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card variant="lift" className="p-6 h-full">
                <div className="mb-4">{value.icon}</div>
                <h3 className="text-lg font-semibold text-brand-ink mb-2">{value.title}</h3>
                <p className="text-brand-muted text-sm leading-relaxed">{value.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-[1120px] mx-auto px-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink mb-6 text-center">
            How RashPOD works
          </h2>
          <p className="text-lg text-brand-muted mb-12 text-center max-w-3xl mx-auto">
            RashPOD is a Print-On-Demand (POD) platform. Designers upload artwork, we apply it to products,
            customers order, and we print & ship. No inventory, no upfront costs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="text-2xl font-bold text-brand-blue mb-4">1. Design</div>
              <p className="text-brand-muted leading-relaxed">
                Designers upload artwork. Our platform generates mockups and listings automatically.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-brand-blue mb-4">2. Sell</div>
              <p className="text-brand-muted leading-relaxed">
                Customers browse and purchase products. Designers earn royalties on every sale.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-brand-blue mb-4">3. Fulfill</div>
              <p className="text-brand-muted leading-relaxed">
                We print on-demand and ship directly to customers. Quality guaranteed.
              </p>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-[1120px] mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-ink mb-6">
            Ready to join RashPOD?
          </h2>
          <p className="text-lg text-brand-muted mb-8 max-w-2xl mx-auto">
            Whether you're a designer looking to monetize your work or a customer seeking unique products,
            RashPOD is your platform.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href={`${dashboardUrl}/auth/register?role=designer`}>
              <Button variant="primaryPeach" size="lg">
                Start selling
              </Button>
            </a>
            <Link href="/shop">
              <Button variant="primaryBlue" size="lg">
                Browse shop
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
