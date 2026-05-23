import { StorePage } from "../storefront-ui";

export default function AboutPage() {
  return (
    <StorePage>
      <section className="max-w-3xl text-brand-ink">
        <h1 className="text-h2 font-bold">About RashPOD</h1>
        <p className="mt-6 text-body leading-relaxed text-brand-muted">
          RashPOD is a Uzbekistan-first print-on-demand platform that helps designers turn creative work into sellable products,
          DTF/UV-DTF transfer films, and corporate merchandise opportunities.
        </p>
        <p className="mt-4 text-body leading-relaxed text-brand-muted">
          We handle production, quality control, delivery, and publishing so creators can focus on design while customers discover original local products.
        </p>
      </section>
    </StorePage>
  );
}
