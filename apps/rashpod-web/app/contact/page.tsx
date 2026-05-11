"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button, Card, FormField, Input, Select, Textarea } from "@rashpod/ui";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "general",
    message: "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    // TODO: POST /contact/messages once the backend endpoint exists.
    setTimeout(() => setStatus("sent"), 600);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="text-center mb-10"
      >
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand-peach mb-2">
          Get in touch
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-brand-ink mb-3">We&rsquo;d love to hear from you</h1>
        <p className="text-[15px] text-brand-muted max-w-[560px] mx-auto">
          Whether you&rsquo;re a designer, customer, print shop or corporate client — drop us a line.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card variant="flat" className="!p-6">
          {status === "sent" ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-semantic-successBg text-semantic-success">
                <Send className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-brand-ink mb-1">Message sent</h2>
              <p className="text-[14px] text-brand-muted">
                Thanks {form.name || "for reaching out"} — we&rsquo;ll get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Name">
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </FormField>
              </div>

              <FormField label="Topic">
                <Select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                >
                  <option value="general">General question</option>
                  <option value="designer">Designer onboarding</option>
                  <option value="order">Order or delivery issue</option>
                  <option value="film">DTF / UV-DTF films</option>
                  <option value="corporate">Corporate merchandise</option>
                  <option value="press">Press &amp; partnerships</option>
                </Select>
              </FormField>

              <FormField label="Message">
                <Textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us a bit about what you need…"
                />
              </FormField>

              <div>
                <Button
                  type="submit"
                  variant="primaryPeach"
                  size="md"
                  disabled={status === "submitting"}
                >
                  <Send size={16} className="mr-2" aria-hidden="true" />
                  {status === "submitting" ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="space-y-3">
          <Card variant="flat" className="!p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                <Mail size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-ink mb-1">Email</h3>
                <a
                  href="mailto:hello@rashpod.uz"
                  className="text-[13px] text-brand-muted hover:text-brand-blue"
                >
                  hello@rashpod.uz
                </a>
              </div>
            </div>
          </Card>

          <Card variant="flat" className="!p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-peachLight text-brand-peach">
                <Phone size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-ink mb-1">Phone</h3>
                <a
                  href="tel:+998000000000"
                  className="text-[13px] text-brand-muted hover:text-brand-blue"
                >
                  +998 00 000 0000
                </a>
                <p className="text-[12px] text-brand-muted mt-0.5">Mon–Fri · 09:00–18:00</p>
              </div>
            </div>
          </Card>

          <Card variant="flat" className="!p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                <MapPin size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-ink mb-1">Studio</h3>
                <p className="text-[13px] text-brand-muted">Tashkent, Uzbekistan</p>
                <p className="text-[12px] text-brand-muted mt-0.5">Visits by appointment only.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
