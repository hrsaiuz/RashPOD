import Link from "next/link";
import { ProductTypeTile, StorePage } from "../storefront-ui";

const benefits = [
  ["No inventory needed", "Upload your artwork and create products without buying stock or managing production."],
  ["Earn from every sale", "Receive royalties when your approved products are sold through RashPOD."],
  ["We handle production", "RashPOD manages printing, quality checks, packaging, and delivery."],
  ["Sell across channels", "Your products can be published on RashPOD Shop and selected partner marketplaces."],
];

const steps = [
  ["Apply as a designer", "Create your profile, share your portfolio, and submit your application for review."],
  ["Upload your artwork", "After approval, upload original designs and prepare them for RashPOD products."],
  ["Create products", "Place your designs on T-shirts, mugs, posters, postcards, and other supported products."],
  ["Submit for review", "Our team checks design quality, originality, mockups, and marketplace readiness."],
  ["Earn royalties", "Once your products are published, you can track sales and royalties from your dashboard."],
];

export default function SellOnRashpodPage() {
  return (
    <StorePage>
      <section className="text-black">
        <h1 className="text-[24px] font-bold">Sell your designs on RashPOD</h1>
        <p className="mt-7 text-[21px]">Turn your artwork into real products and earn royalties from every sale. RashPOD handles production, quality control, delivery, and publishing</p>
      </section>

      <section className="mt-12">
        <h2 className="text-[18px] font-bold text-black">Why Join RashPOD</h2>
        <p className="mt-4 text-[14px] text-black">Why designers join RashPOD</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map(([title, body]) => (
            <div key={title} className="min-h-[150px] rounded-[16px] bg-brand-peach p-6 text-center text-black">
              <h3 className="text-[17px] font-bold">{title}</h3>
              <p className="mt-8 text-[17px] leading-6">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-7 text-[18px] font-bold text-black">How selling works</h2>
        <div className="space-y-3">
          {steps.map(([title, body], index) => (
            <div key={title} className="grid min-h-[84px] grid-cols-[70px_1fr] items-center rounded-[14px] border border-brand-peach px-6 text-black">
              <span className="text-[54px] font-black leading-none">{index + 1}</span>
              <div>
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-[13px] font-bold">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-8 text-[18px] font-bold text-black">What You Can Sell</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ProductTypeTile label="ceramics" title="mug" />
          <ProductTypeTile label="prints" title="postal card" />
          <ProductTypeTile label="clothes" title="hat" />
          <ProductTypeTile label="clothes" title="hoodie" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[18px] font-bold text-black">What we look for</h2>
        <p className="mt-5 text-[16px] text-black">We review every designer application to protect product quality, originality, and the RashPOD creative community.</p>
        <div className="mt-7 flex flex-wrap gap-5">
          {["Original Artwork", "Strong Visual Style", "High Quality Designs", "Clear Portfolio", "Good Sample Work", "No Copied Content"].map((item) => (
            <span key={item} className="rounded-[8px] border border-brand-peach px-3 py-2 text-[30px] font-black leading-none text-black">{item}</span>
          ))}
        </div>
      </section>

      <section className="mt-16 text-center text-black">
        <h2 className="text-[22px] font-bold">Ready to turn your art into products?</h2>
        <p className="mt-8 text-[16px]">Apply to become a RashPOD designer and start building your product catalog.</p>
        <Link href="/designer-application" className="mt-10 inline-flex h-[68px] items-center rounded-[18px] bg-brand-peach px-12 text-[20px] font-bold tracking-[0.08em] text-white">
          Apply as a Designer
        </Link>
      </section>
    </StorePage>
  );
}
