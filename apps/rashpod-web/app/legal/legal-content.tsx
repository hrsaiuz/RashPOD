import { StorePage } from "../storefront-ui";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <StorePage>
      <article className="max-w-[1320px] text-black">
        <h1 className="text-[28px] font-bold">{title}</h1>
        <p className="mt-10 text-[15px] text-[#4B4B55]">Last updated: May 2026</p>
        <div className="mt-16 space-y-10 text-[22px] leading-[1.55]">{children}</div>
      </article>
    </StorePage>
  );
}
