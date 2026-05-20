import Link from "next/link";
import { Search, Star } from "lucide-react";
import { StorePage } from "../storefront-ui";

const cards = [
  "Beautiful Samarkand",
  "Kuch birlikda",
  "Yuliy Rajabiy",
  "Beautiful Samarkand",
  "Kuch birlikda",
  "Yuliy Rajabiy",
];

export default function FilmPage() {
  return (
    <StorePage>
      <div className="grid gap-7 lg:grid-cols-[310px_1fr]">
        <aside className="rounded-[12px] bg-brand-bg p-5">
          <h1 className="mb-8 text-[18px] font-black uppercase text-black">Filters</h1>
          <div className="mb-8 flex items-center gap-3 text-[#8E8E94]">
            <Search size={16} />
            <span className="text-[12px] uppercase">Search</span>
          </div>
          <div className="mb-12 inline-flex rounded-[10px] border border-brand-blue">
            <button className="rounded-[8px] bg-brand-blue px-4 py-2 text-sm text-white">DTF</button>
            <button className="px-4 py-2 text-sm text-black">UV DTF</button>
          </div>
          {["Design category", "Size", "Price", "Color Type", "Rate", "Designer", "Tags"].map((label) => (
            <div key={label} className="border-b border-brand-blueLight py-5">
              <h2 className="text-[16px] font-black uppercase text-black">{label}</h2>
              {label === "Rate" ? (
                <div className="mt-4 flex gap-3 text-brand-peach">
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={20} fill={n < 3 ? "currentColor" : "none"} />)}
                </div>
              ) : null}
            </div>
          ))}
        </aside>
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((title, index) => (
            <Link key={`${title}-${index}`} href="/film/sample" className="rounded-[12px] bg-brand-bg p-6">
              <div className="relative aspect-square overflow-hidden rounded-[28px] bg-white">
                <span className="absolute left-5 top-5 rounded-[8px] bg-[#D66BCD] px-3 py-2 text-[10px] text-white">Best Seller</span>
                <div className={`grid h-full place-items-center ${index % 3 === 1 ? "bg-[#101214]" : "bg-[#F7F7FA]"}`}>
                  <div className={`h-36 w-44 rounded-[30px] ${index % 3 === 1 ? "bg-black text-white" : "bg-white text-[#1E2B6E]"} grid place-items-center text-center text-lg font-bold shadow-soft`}>
                    {title}
                  </div>
                </div>
              </div>
              <h2 className="mt-5 text-[20px] font-black text-black">CLASSIC Black T-Shirt</h2>
              <p className="mt-1 text-[12px] text-[#8E8E94]">Designed by Shuwan</p>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-[20px] font-black text-black">20$</p>
                <span className="rounded-[10px] bg-brand-peach px-6 py-3 text-[14px] font-bold text-white">See Product</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </StorePage>
  );
}
