"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import { Button, Card } from "@rashpod/ui";

const FAQS = [
  {
    section: "For designers",
    items: [
      {
        q: "How do royalties work?",
        a: "Designers earn a royalty on every product sold featuring their design. The default rate is 15% of net profit and is paid out monthly to your bank or Click wallet. The exact rate is visible on every listing in your dashboard.",
      },
      {
        q: "Do product approval and film-sale approval differ?",
        a: "Yes. Approval for product sales does not automatically grant DTF/UV-DTF film-sale rights — you must opt in to film sales explicitly per design, and the moderation team reviews film readiness separately.",
      },
      {
        q: "What file types do you accept?",
        a: "PNG, JPEG, SVG, and AI files. For best results, upload high-resolution files (≥300 DPI) with transparent backgrounds where appropriate.",
      },
      {
        q: "How long does approval take?",
        a: "Most submissions are reviewed within 24–48 hours. You'll get email + dashboard notifications when your design is approved, needs changes, or is rejected.",
      },
    ],
  },
  {
    section: "For customers",
    items: [
      {
        q: "How long does shipping take?",
        a: "Standard shipping within Uzbekistan takes 3–7 business days via Yandex or UzPost. Pickup from our Tashkent studio is also available.",
      },
      {
        q: "What is your return policy?",
        a: "We accept returns within 14 days for defective or damaged items. Because every product is printed on demand, change-of-mind returns are not accepted.",
      },
      {
        q: "Can I customize the size and color?",
        a: "Yes — every product detail page lets you pick from the size, color and quantity options the designer has enabled for that listing.",
      },
      {
        q: "How are payments handled?",
        a: "We accept Click and bank cards. Payments are processed securely; we never store full card numbers on our servers.",
      },
    ],
  },
  {
    section: "For print shops",
    items: [
      {
        q: "How does DTF/UV-DTF film licensing work?",
        a: "Print shops can purchase ready-to-print films from designers who have opted in to film sales. Each purchase grants a single-use commercial license for the film you receive.",
      },
      {
        q: "Can I bid on corporate jobs?",
        a: "Yes — verified print shops can submit bids on corporate merchandise requests posted by clients. The corporate dashboard lets you track every bid and contract.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-[840px] mx-auto px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="text-center mb-10"
      >
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-blue mb-2">
          Help center
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-brand-ink mb-3">
          Frequently asked questions
        </h1>
        <p className="text-[15px] text-brand-muted max-w-[560px] mx-auto">
          Answers to the most common questions about selling, buying and licensing on RashPOD.
        </p>
      </motion.div>

      <div className="space-y-10">
        {FAQS.map((group) => (
          <div key={group.section}>
            <h2 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-3">
              {group.section}
            </h2>
            <div className="space-y-3">
              {group.items.map((faq, i) => (
                <details
                  key={i}
                  className="group bg-white rounded-2xl px-5 py-4 shadow-sm border border-surface-borderSoft"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 rounded">
                    <span className="text-[15px] font-semibold text-brand-ink pr-4">{faq.q}</span>
                    <ChevronDown
                      className="w-4 h-4 text-brand-muted group-open:rotate-180 transition-transform shrink-0"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-[14px] text-brand-muted leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card variant="flat" className="!p-6 mt-12 text-center bg-brand-blueLight/40">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <MessageCircle className="w-5 h-5 text-brand-blue" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-brand-ink mb-1">Still have questions?</h3>
        <p className="text-[14px] text-brand-muted mb-4">
          Our team typically replies within one business day.
        </p>
        <Link href="/contact">
          <Button variant="primaryBlue" size="md">
            <Mail size={16} className="mr-2" aria-hidden="true" />
            Contact support
          </Button>
        </Link>
      </Card>
    </div>
  );
}
