"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  UploadCloud,
  CheckCircle,
  DollarSign,
  ShoppingBag,
  Paintbrush,
  Package,
  Layers,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { Button, Card, getDashboardUrl } from "@rashpod/ui";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.24 },
};

const FLOWS = [
  {
    audience: "Designers",
    tone: "peach" as const,
    cta: { label: "Start selling", href: "/auth/register?role=designer" },
    steps: [
      { icon: <UploadCloud size={18} />, title: "Upload your design", desc: "We apply it across product types automatically — no design rework required." },
      { icon: <CheckCircle size={18} />, title: "Get approved", desc: "Moderators review for quality and rights within 24–48 hours." },
      { icon: <DollarSign size={18} />, title: "Earn royalties", desc: "Track every sale and royalty payout from your designer dashboard." },
    ],
  },
  {
    audience: "Customers",
    tone: "blue" as const,
    cta: { label: "Open the shop", href: "/shop" },
    steps: [
      { icon: <ShoppingBag size={18} />, title: "Browse designs", desc: "Discover unique designs from talented creators across Uzbekistan." },
      { icon: <Paintbrush size={18} />, title: "Customize", desc: "Pick size, colour and quantity. Preview before you buy." },
      { icon: <Package size={18} />, title: "Get it delivered", desc: "Printed on demand and shipped via Yandex or UzPost." },
    ],
  },
  {
    audience: "Print shops",
    tone: "peach" as const,
    cta: { label: "Browse films", href: "/film" },
    steps: [
      { icon: <Layers size={18} />, title: "License a film", desc: "Buy ready-to-print DTF or UV-DTF films from approved designers." },
      { icon: <CheckCircle size={18} />, title: "Receive the file", desc: "Each purchase grants a single-use commercial license — fully legal." },
      { icon: <Package size={18} />, title: "Print & deliver", desc: "Use the licensed film for your local jobs without any rights worries." },
    ],
  },
  {
    audience: "Corporate clients",
    tone: "blue" as const,
    cta: { label: "Request a quote", href: "/corporate" },
    steps: [
      { icon: <Briefcase size={18} />, title: "Post a request", desc: "Describe your bulk order — product, quantity, timeline, branding." },
      { icon: <Paintbrush size={18} />, title: "Compare bids", desc: "Verified print shops bid on your job. You pick the best offer." },
      { icon: <Package size={18} />, title: "Get it delivered", desc: "Track production and delivery from a single dashboard." },
    ],
  },
];

export default function HowItWorksPage() {
  const dashboardUrl = getDashboardUrl();

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="text-center mb-14 max-w-[720px] mx-auto"
      >
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-blue mb-2">
          How RashPOD works
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-brand-ink mb-3">
          One platform, four audiences, zero friction
        </h1>
        <p className="text-[15px] text-brand-muted">
          RashPOD connects designers, customers, print shops and corporate clients in a single
          print-on-demand marketplace built for Uzbekistan. Pick the flow that fits you.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {FLOWS.map((flow) => (
          <motion.div key={flow.audience} {...fadeIn}>
            <Card variant="flat" className="!p-6 h-full flex flex-col">
              <p
                className={`text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 ${
                  flow.tone === "blue" ? "text-brand-blue" : "text-brand-peach"
                }`}
              >
                For {flow.audience.toLowerCase()}
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-brand-ink mb-5">
                {flow.audience}
              </h2>
              <div className="space-y-3 flex-1">
                {flow.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        flow.tone === "blue"
                          ? "bg-brand-blueLight text-brand-blue"
                          : "bg-brand-peachLight text-brand-peach"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-brand-ink mb-0.5">{step.title}</h3>
                      <p className="text-[13px] text-brand-muted leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-5 mt-5 border-t border-surface-borderSoft">
                <Link
                  href={flow.cta.href.startsWith("/auth") ? `${dashboardUrl}${flow.cta.href}` : flow.cta.href}
                >
                  <Button variant={flow.tone === "blue" ? "primaryBlue" : "primaryPeach"} size="md">
                    {flow.cta.label}
                    <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card variant="flat" className="!p-8 text-center bg-gradient-to-br from-brand-blueLight/40 to-brand-peachLight/40">
        <h2 className="text-2xl font-bold text-brand-ink mb-2">Ready to get started?</h2>
        <p className="text-[14px] text-brand-muted mb-5 max-w-[480px] mx-auto">
          Whichever side of the marketplace you&rsquo;re on, you can sign up in under a minute.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`${dashboardUrl}/auth/register?role=designer`}>
            <Button variant="primaryPeach" size="md">Become a designer</Button>
          </Link>
          <Link href="/shop">
            <Button variant="primaryBlue" size="md">Open the shop</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
