"use client";

import Link from "next/link";
import { DecorativeBackground } from "@rashpod/ui";
import { Button } from "@rashpod/ui";
import { motion } from "framer-motion";
import { UploadCloud, CheckCircle, Package, DollarSign, Image as ImageIcon, Briefcase } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen pb-20">
      <DecorativeBackground />
      
      <div className="max-w-[1120px] mx-auto px-6 pt-24 pb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <h1 className="text-[clamp(36px,5vw,56px)] font-bold leading-[1.1] tracking-tight text-brand-ink mb-6">
            Upload your designs.<br />Sell products. Earn royalties.
          </h1>
          <p className="text-lg md:text-xl text-brand-muted mb-10 leading-relaxed max-w-[560px]">
            Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate merchandise opportunities.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/auth/register">
              <Button variant="primaryPeach" size="lg">Start selling your designs</Button>
            </Link>
            <Link href="/shop">
              <Button variant="primaryBlue" size="lg">Open RashPOD Shop</Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="max-w-[1120px] mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <UploadCloud className="w-8 h-8 text-brand-blue" />, title: "Upload once", desc: "Upload your design file once and apply it to any product." },
            { icon: <Package className="w-8 h-8 text-brand-blue" />, title: "Auto listings", desc: "We generate product mockups and create your shop listing automatically." },
            { icon: <DollarSign className="w-8 h-8 text-brand-blue" />, title: "Earn royalties", desc: "Get paid every time someone buys a product featuring your design." },
            { icon: <ImageIcon className="w-8 h-8 text-brand-blue" />, title: "DTF / UV Films", desc: "Enable film sales and reach print shops across Uzbekistan." },
          ].map((f, i) => (
            <motion.div 
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -4 }}
              className="bg-surface-card rounded-[24px] p-6 shadow-sm border border-surface-border-soft"
            >
              <div className="w-14 h-14 rounded-full bg-brand-bg flex items-center justify-center mb-6">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-brand-ink mb-2">{f.title}</h3>
              <p className="text-brand-muted text-[15px] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
