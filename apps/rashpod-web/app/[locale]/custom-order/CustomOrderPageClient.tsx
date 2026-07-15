"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProductTypeTile, StorePage, UnderlineInput, UnderlineSelect, UploadButton } from "../storefront-ui";
import type { ShopSettings } from "../../../lib/shop-settings";
import { uploadIntakeFiles } from "../../../lib/intake-upload";

function fileNames(files: FileList | null) {
  return files ? Array.from(files).map((file) => ({ name: file.name, size: file.size, type: file.type })) : [];
}

const DEFAULT_DELIVERY_OPTIONS = ["Pickup", "Yandex Delivery", "UzPost"];

function buildDeliveryOptions(shopSettings: ShopSettings) {
  const options = shopSettings.deliveryOptions.map((option) => option.displayName).filter(Boolean);
  if (shopSettings.pickup?.displayName) {
    options.push(shopSettings.pickup.displayName);
  }
  return options.length > 0 ? Array.from(new Set(options)) : DEFAULT_DELIVERY_OPTIONS;
}

type CustomOrderProduct = { key: string; label: string; title: string; imageUrl: string | null; altText: string };

const FALLBACK_PRODUCTS: CustomOrderProduct[] = [
  { key: "mug", label: "ceramics", title: "mug", imageUrl: null, altText: "RashPOD mug" },
  { key: "postal-card", label: "prints", title: "postal card", imageUrl: null, altText: "RashPOD postal card" },
  { key: "hat", label: "clothes", title: "hat", imageUrl: null, altText: "RashPOD hat" },
  { key: "hoodie", label: "clothes", title: "hoodie", imageUrl: null, altText: "RashPOD hoodie" },
];

export default function CustomOrderPageClient({ shopSettings, productTypes }: { shopSettings: ShopSettings; productTypes: CustomOrderProduct[] }) {
  const router = useRouter();
  const t = useTranslations("customOrderCards");
  const deliveryOptions = useMemo(() => buildDeliveryOptions(shopSettings), [shopSettings]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    companyEventName: "",
    email: "",
    phoneCountryCode: "+998",
    phoneNumber: "",
    details: "",
    estimatedBudget: "",
    preferredDelivery: "",
    productNeed: "",
    quantity: "",
    deadline: "",
    hasDesign: "",
    designTypes: "",
    uploadedFiles: [] as Array<{ name: string; size: number; type: string }>,
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const uploadedFiles = await uploadIntakeFiles(uploadFiles);
      const res = await fetch("/api/proxy/intake/custom-order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, uploadedFiles, deadline: form.deadline || undefined }),
      });
      if (res.ok) router.push("/custom-order/success");
      else setError("Could not submit your request. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload files or submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StorePage>
      <h1 className="text-[20px] font-bold text-black">Custom Orders</h1>
      <p className="mt-7 text-[18px] text-black">Custom printed products for teams, brands, and events</p>
      <p className="mt-6 text-[14px] text-black">Need T-shirts, apparel, gifts, or printed products for your company or event? Send us your brief and RashPOD will help design, produce, and deliver your custom order.</p>

      <section className="mt-20">
        <h2 className="mb-10 text-[16px] font-bold text-black">See what we can make</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(productTypes.length ? productTypes : FALLBACK_PRODUCTS).map((product) => (
            <ProductTypeTile key={product.key} label={t(`${product.key}.label`)} title={t(`${product.key}.title`)} img={product.imageUrl} alt={product.altText || t(`${product.key}.alt`)} fallbackLabel={t("imageUnavailable", { product: t(`${product.key}.title`) })} onClick={() => setForm((current) => ({ ...current, productNeed: product.title }))} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-10 text-[16px] font-bold text-black">Who it’s for</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {["Companies", "Events", "Campaigns", "Teams & Communities"].map((title) => (
            <div key={title} className="rounded-[14px] border border-brand-ink p-8 text-center text-black">
              <h3 className="font-bold">{title}</h3>
              <p className="mt-6 text-[13px] font-bold">Custom apparel and printed items for groups, launches, promotions, and branded gifts.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-10 text-[16px] font-bold text-black">How custom orders work</h2>
        <div className="space-y-3">
          {["Send your brief", "We review the request", "Design and approval", "Production and delivery"].map((title, i) => (
            <div key={title} className="grid min-h-[82px] grid-cols-[70px_1fr] items-center rounded-[14px] border border-brand-ink px-6 text-black">
              <span className="text-[58px] font-black leading-none">{i + 1}</span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-[13px] font-bold">Tell us what you need, then our team checks timing, production method, and delivery.</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={submit} className="mt-20 grid overflow-hidden rounded-[28px] border border-brand-muted/60 bg-brand-bg lg:grid-cols-2">
        <div className="space-y-12 border-r border-brand-blueLight p-10">
          <div className="grid gap-8 md:grid-cols-2">
            <UnderlineInput label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <UnderlineInput label="Company / event name" value={form.companyEventName} onChange={(e) => setForm({ ...form, companyEventName: e.target.value })} />
            <UnderlineInput label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="block">
              <span className="mb-3 block text-[15px] text-brand-subtle">Phone Number</span>
              <div className="flex items-end gap-3 border-b border-brand-subtle pb-3">
                <span className="shrink-0 text-[20px] text-brand-ink">{form.phoneCountryCode}</span>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="50 270 00 00"
                  className="w-full bg-transparent text-[20px] text-brand-ink outline-none"
                />
              </div>
            </label>
          </div>
          <label className="block">
            <span className="mb-3 block text-[16px] text-black">Tell us about your company, event, product idea, preferred colors, placement, and any important details.</span>
            <textarea rows={6} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="w-full border-0 border-b border-brand-subtle bg-transparent outline-none" />
          </label>
          <div className="grid gap-8 md:grid-cols-2">
            <UnderlineInput label="Estimated budget" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} />
            <UnderlineSelect label="Preferred delivery method" value={form.preferredDelivery} onChange={(e) => setForm({ ...form, preferredDelivery: e.target.value })}>
              <option value="">Choose method</option>
              {deliveryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </UnderlineSelect>
          </div>
        </div>
        <div className="space-y-12 p-10">
          <UnderlineSelect label="What do you need?" value={form.productNeed} onChange={(e) => setForm({ ...form, productNeed: e.target.value })}>
            <option value="">Choose product</option>
            <option>T-shirts</option>
            <option>Hoodies</option>
            <option>Mugs</option>
            <option>Print-ready films</option>
          </UnderlineSelect>
          <UnderlineInput label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <UnderlineInput label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <UnderlineSelect label="Do you already have a design?" value={form.hasDesign} onChange={(e) => setForm({ ...form, hasDesign: e.target.value })}>
            <option value="">Choose</option>
            <option>Yes, I have a ready design</option>
            <option>No, I need design help</option>
          </UnderlineSelect>
          <UnderlineInput label="What Types of Designs Do You Need?" value={form.designTypes} onChange={(e) => setForm({ ...form, designTypes: e.target.value })} />
          <UploadButton
            label="Upload logo or design files"
            onChange={(files) => {
              setForm({ ...form, uploadedFiles: fileNames(files) });
              setUploadFiles(files ? Array.from(files) : []);
            }}
          />
          {error ? <p className="text-sm font-medium text-semantic-dangerText">{error}</p> : null}
          <div className="flex justify-end pt-20">
            <button disabled={submitting} className="h-[72px] min-w-[170px] rounded-[18px] bg-brand-peach text-[22px] font-bold text-white">
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </StorePage>
  );
}
