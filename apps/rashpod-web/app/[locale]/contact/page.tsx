"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { StorePage, UnderlineInput } from "../storefront-ui";

const contacts = [
  ["Designer Support", "For designer applications, portfolio review, royalties, and product approvals.", "+998 50 270 00 00", "hello@rashpod.uz", "RASHPOD_DESIGNERS", "bg-brand-peach text-black"],
  ["Custom Orders", "For companies, teams, events, and branded product requests.", "+998 50 270 00 00", "hello@rashpod.uz", "RASHPOD_CUSTOM", "bg-brand-ink text-white"],
  ["Print-Ready Films", "For DTF films, UV-DTF films, file requirements, and production questions.", "+998 50 270 00 00", "hello@rashpod.uz", "RASHPOD_FILMS", "bg-brand-bg text-black"],
  ["Customer Support", "For questions about orders, delivery, returns, or product details.", "+998 50 270 00 00", "hello@rashpod.uz", "RASHPOD_CUSTOMER", "bg-brand-blue text-white"],
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", subject: "Order support", message: "" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/proxy/intake/contact-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <StorePage>
      <h1 className="text-[27px] font-bold text-black">Contact Us</h1>
      <p className="mt-7 text-[22px] text-black">Have a question, project request, or partnership idea? Get in touch with the RashPOD team.</p>
      <section className="mt-12 space-y-7 text-black">
        <h2 className="text-[22px] font-bold">What is RashPOD?</h2>
        <p className="text-[16px] leading-8">RashPOD connects independent designers, customers, businesses, and print production services in one platform.</p>
        <p className="text-[16px] leading-8">Customers can shop original products created by designers. Designers can upload their artwork and earn royalties from every sale. Businesses can request custom branded products for teams, events, and campaigns. Print shops and small production teams can order ready-to-press DTF and UV-DTF films.</p>
      </section>

      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {contacts.map(([title, body, phone, email, handle, className]) => (
          <div key={title} className={`min-h-[258px] rounded-[8px] p-5 text-center ${className}`}>
            <h3 className="text-[32px] font-black leading-tight">{title}</h3>
            <p className="mt-8 text-[18px] leading-6">{body}</p>
            <p className="mt-10 text-[28px]">{phone}</p>
            <p className="mt-4 flex items-center justify-center gap-2 text-[18px]"><Mail size={18} /> {email}</p>
            <p className="mt-6 flex items-center justify-center gap-1 text-[18px]"><Send size={21} /> {handle}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 grid overflow-hidden rounded-[32px] border border-brand-ink bg-brand-bg lg:grid-cols-[520px_1fr]">
        <div className="relative min-h-[520px] overflow-hidden bg-brand-blueLight p-12">
          <h2 className="text-[34px] font-bold text-black">Contact Information</h2>
          <p className="mt-7 text-[22px] text-brand-muted">Say something to start a live chat!</p>
          <div className="mt-32 space-y-16 text-[20px] text-brand-text">
            <p className="flex items-center gap-10"><Phone /> +998 50 270 00 00</p>
            <p className="flex items-center gap-10"><Mail /> hello@rashpod.uz</p>
            <p className="flex items-center gap-10"><MapPin /> Tashkent, Uzbekistan</p>
          </div>
          <div className="absolute -bottom-24 right-0 h-52 w-52 rounded-full bg-brand-peachLight" />
          <div className="absolute bottom-16 right-24 h-36 w-36 rounded-full bg-brand-peach" />
        </div>
        <form onSubmit={submit} className="space-y-10 p-12">
          {status === "sent" ? (
            <div className="rounded-[24px] bg-white p-10 text-center">
              <h2 className="text-2xl font-bold text-black">Message sent</h2>
              <p className="mt-3 text-brand-muted">We’ll review your message and get back to you.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-10 md:grid-cols-2">
                <UnderlineInput label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <UnderlineInput label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                <UnderlineInput label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <UnderlineInput label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </div>
              <fieldset>
                <legend className="mb-4 text-[16px] font-bold text-brand-ink">Select Subject?</legend>
                <div className="flex flex-wrap gap-x-8 gap-y-4 text-[14px] text-brand-text">
                  {["Order support", "Custom project", "DTF / UV-DTF films", "Designer application", "Partnership", "Other"].map((subject) => (
                    <label key={subject} className="flex items-center gap-2">
                      <input type="radio" name="subject" checked={form.subject === subject} onChange={() => setForm({ ...form, subject })} />
                      {subject}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-3 block text-[15px] text-brand-subtle">Message</span>
                <textarea required rows={6} placeholder="Write your message.." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-[18px] border border-brand-muted/60 bg-transparent px-4 py-4 outline-none" />
              </label>
              {status === "error" ? (
                <p className="text-sm font-medium text-semantic-dangerText">Could not send your message. Please try again.</p>
              ) : null}
              <div className="flex justify-end">
                <button disabled={status === "submitting"} className="h-[64px] min-w-[220px] rounded-[18px] bg-brand-peach px-8 text-[22px] font-bold text-white">
                  {status === "submitting" ? "Sending..." : "Send Message"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </StorePage>
  );
}
