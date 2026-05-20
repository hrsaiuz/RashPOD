import { SimpleCta, StorePage } from "../storefront-ui";

const audience = [
  { title: "For designers", body: "Upload your artwork, create products, and earn royalties without handling production or delivery.", className: "bg-brand-peach text-black" },
  { title: "For custom orders", body: "Request custom branded products for your company, team, event, or campaign.", className: "bg-[#313238] text-white" },
  { title: "Print-Ready Films", body: "Order DTF and UV-DTF films prepared for apparel, stickers, packaging, and small production runs.", className: "bg-brand-bg text-black" },
  { title: "For customers", body: "Shop original apparel, prints, mugs, postcards, and gifts created by independent designers.", className: "bg-brand-blue text-white" },
];

export default function AboutPage() {
  return (
    <StorePage>
      <div className="space-y-12 text-black">
        <section className="space-y-8">
          <h1 className="text-[27px] font-bold">About RashPOD</h1>
          <p className="text-[22px]">RashPOD is a creative print-on-demand platform that turns original designs into real products.</p>
        </section>

        <section className="space-y-8">
          <h2 className="text-[22px] font-bold">What is RashPOD?</h2>
          <p className="text-[17px] leading-8">RashPOD connects independent designers, customers, businesses, and print production services in one platform.</p>
          <p className="text-[17px] leading-8">
            Customers can shop original products created by designers. Designers can upload their artwork and earn royalties from every sale. Businesses can request custom branded products for teams, events, and campaigns. Print shops and small production teams can order ready-to-press DTF and UV-DTF films.
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-[22px] font-bold">Our mission</h2>
          <p className="text-[17px] leading-8">Our mission is to make creative work easier to publish, sell, and produce.</p>
          <p className="text-[17px] leading-8">
            We want to help designers turn their ideas into products without managing inventory, printing, packaging, or delivery. At the same time, we want customers to discover unique products that support real creators.
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-[22px] font-bold">Made for creators, built for production</h2>
          <p className="text-[17px] leading-8">
            RashPOD combines creativity with local production. Every product is made on demand, checked for quality, and prepared for delivery after an order is placed.
          </p>
          <p className="text-[17px] leading-8">
            This helps reduce unnecessary stock, supports independent designers, and gives customers access to fresh and original products.
          </p>
        </section>

        <section>
          <h2 className="mb-8 text-[22px] font-bold">Who RashPOD is for</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {audience.map((item) => (
              <div key={item.title} className={`min-h-[214px] rounded-[8px] p-6 text-center ${item.className}`}>
                <h3 className="text-[36px] font-black leading-tight">{item.title}</h3>
                <p className="mt-10 text-[22px] leading-7">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <SimpleCta />
      </div>
    </StorePage>
  );
}
