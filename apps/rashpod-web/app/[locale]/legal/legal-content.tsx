import { StorePage } from "../storefront-ui";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <StorePage>
      <article className="max-w-[1320px] text-black">
        <h1 className="text-[28px] font-bold">{title}</h1>
        <p className="mt-10 text-[15px] text-brand-muted">Last updated: May 2026</p>
        <div className="mt-16 space-y-10 text-[18px] leading-[1.55] [&_h2]:text-[22px] [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-8">{children}</div>
      </article>
    </StorePage>
  );
}
