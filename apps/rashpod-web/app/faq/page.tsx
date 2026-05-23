"use client";

import { ChevronDown } from "lucide-react";
import { StorePage } from "../storefront-ui";

const groups = [
  {
    title: "Shopping",
    items: [
      ["What can I buy on RashPOD?", "You can shop products such as T-shirts, hoodies, mugs, posters, postcards, hats, and other printed items created by independent designers."],
      ["Are RashPOD products ready-made?", "Most products are made on demand after your order is confirmed."],
      ["Can I choose size and color?", "Available sizes and colors depend on the product template and listing settings."],
    ],
  },
  {
    title: "Delivery",
    items: [
      ["How long does delivery take?", "Delivery time includes production time and courier delivery time. Exact estimates depend on destination and provider."],
      ["Can I choose a delivery time?", "When available, delivery options are shown at checkout."],
      ["Do you offer free shipping?", "Free shipping can be available when admin delivery settings enable it."],
    ],
  },
  {
    title: "Returns",
    items: [
      ["Can I return my order?", "Defective or damaged items can be reviewed for return or replacement."],
      ["Can I exchange the size?", "Because products are made on demand, exchanges depend on the issue and product condition."],
    ],
  },
  {
    title: "Designers",
    items: [
      ["How can I become a designer on RashPOD?", "Apply through the designer application page and submit your profile and portfolio for review."],
      ["Do designers need to handle printing or delivery?", "No. RashPOD handles production, packaging, and delivery after orders are placed."],
    ],
  },
  {
    title: "Custom Orders",
    items: [
      ["Can my company order custom products?", "Yes. Submit a custom order brief and our team will review production requirements."],
      ["How do I submit a custom request?", "Use the Custom order page and include product type, quantity, deadline, and design files if available."],
    ],
  },
];

export default function FaqPage() {
  return (
    <StorePage>
      <div className="grid gap-12 lg:grid-cols-[640px_1fr]">
        <div>
          <h1 className="text-[28px] font-bold text-black">Frequently Asked Questions</h1>
          <p className="mt-7 text-[22px] text-black">Find answers about shopping, delivery, designers, custom orders, and print services.</p>

          <div className="mt-20 space-y-10">
            {groups.map((group) => (
              <section key={group.title}>
                <h2 className="mb-6 text-[28px] font-bold text-black">{group.title}</h2>
                <div>
                  {group.items.map(([q, a], index) => (
                    <details key={q} className="group overflow-hidden bg-brand-bg first:rounded-t-[7px] last:rounded-b-[7px]" open={index === 0 && group.title === "Shopping"}>
                      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-5 text-[16px] font-medium text-black">
                        {q}
                        <ChevronDown className="transition-transform group-open:rotate-180" size={20} />
                      </summary>
                      <div className="bg-brand-ink px-5 py-5 text-[17px] leading-8 text-white">{a}</div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="relative hidden min-h-[960px] overflow-hidden lg:block">
          <div className="absolute right-0 top-32 h-[360px] w-[360px] rotate-45 bg-brand-peach" />
          <div className="absolute right-56 top-52 h-44 w-44 rounded-full border-[12px] border-brand-blue" />
          <div className="absolute right-52 top-[620px] h-[360px] w-16 rotate-45 bg-brand-blue" />
          <div className="absolute right-4 bottom-0 h-72 w-72 rounded-full bg-brand-blue" />
          <div className="absolute bottom-28 right-44 h-40 w-40 rounded-full bg-brand-peach" />
        </div>
      </div>
    </StorePage>
  );
}
