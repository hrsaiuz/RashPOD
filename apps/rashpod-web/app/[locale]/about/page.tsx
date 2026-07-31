import { Link } from "../../../i18n/navigation";
import { StorePage } from "../storefront-ui";

const AUDIENCES = [
  { title: "For designers", body: "Upload your artwork, create products, and earn royalties without handling production or delivery.", className: "bg-brand-peach" },
  { title: "For custom orders", body: "Request custom branded products for your company, team, event, or campaign.", className: "bg-brand-ink text-white" },
  { title: "Print-ready films", body: "Order DTF and UV-DTF films prepared for apparel, stickers, packaging, and small production runs.", className: "bg-brand-bg" },
  { title: "For customers", body: "Shop original apparel, prints, mugs, postcards, and gifts created by independent designers.", className: "bg-brand-blue text-white" },
];

export default function AboutPage() {
  return (
    <StorePage>
      <article className="text-brand-ink">
        <header className="max-w-[880px]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-peach">Made in Uzbekistan</p>
          <h1 className="mt-3 text-[clamp(36px,5vw,64px)] font-bold leading-[1.02]">About RashPOD</h1>
          <p className="mt-6 text-lg leading-relaxed text-brand-text">RashPOD is a creative print-on-demand platform that turns original designs into real products.</p>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <h2 className="text-2xl font-bold">What is RashPOD?</h2>
          <div className="space-y-6 text-base leading-7 text-brand-text">
            <p>RashPOD connects independent designers, customers, businesses, and print production services in one platform.</p>
            <p>Customers shop original products created by designers. Designers upload artwork and earn royalties from every sale. Businesses request custom branded products, while print shops and production teams can order ready-to-press DTF and UV-DTF films.</p>
          </div>
          <h2 className="text-2xl font-bold">Our mission</h2>
          <div className="space-y-6 text-base leading-7 text-brand-text">
            <p>Our mission is to make creative work easier to publish, sell, and produce.</p>
            <p>We help designers turn ideas into products without managing inventory, printing, packaging, or delivery—and help customers discover unique work that supports real creators.</p>
          </div>
          <h2 className="text-2xl font-bold">Made for creators, built for production</h2>
          <div className="space-y-6 text-base leading-7 text-brand-text">
            <p>RashPOD combines creativity with local production. Every product is made on demand, checked for quality, and prepared for delivery after an order is placed.</p>
            <p>This reduces unnecessary stock, supports independent designers, and gives customers access to fresh and original products.</p>
          </div>
        </div>

        <section className="mt-16" aria-labelledby="about-audiences">
          <h2 id="about-audiences" className="text-2xl font-bold">Who RashPOD is for</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {AUDIENCES.map((audience) => (
              <div key={audience.title} className={`flex min-h-[230px] flex-col justify-between rounded-category p-7 ${audience.className}`}>
                <h3 className="text-3xl font-bold leading-tight">{audience.title}</h3>
                <p className="mt-8 text-center text-base leading-6">{audience.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-product bg-white px-6 py-12 text-center shadow-soft sm:px-10">
          <h2 className="text-2xl font-bold">Create with RashPOD</h2>
          <p className="mx-auto mt-4 max-w-[760px] text-base leading-7 text-brand-text">Whether you want to shop, sell, customize, or produce, RashPOD helps bring creative ideas into real products.</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-pill bg-brand-blue px-8 font-semibold text-brand-ink transition-colors hover:bg-brand-blueSecondary">Shop products</Link>
            <Link href="/designer-application" className="inline-flex min-h-12 items-center justify-center rounded-pill bg-brand-peach px-8 font-semibold text-brand-ink transition-colors hover:bg-brand-peachSecondary">Start selling</Link>
          </div>
        </section>
      </article>
    </StorePage>
  );
}
