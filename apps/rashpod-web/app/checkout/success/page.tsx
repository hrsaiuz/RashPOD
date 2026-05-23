import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button, PageContainer } from "@rashpod/ui";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  const receiptHref = orderId ? `/account/orders/${encodeURIComponent(orderId)}` : "/account/orders";
  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-24 pt-4">
        <nav className="inline-flex min-h-10 items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
          {["Home", "Category", "Tshirts", "Products"].map((item) => (
            <span key={item} className="flex shrink-0 items-center gap-3 sm:gap-5">
              <Link href={item === "Home" ? "/" : "/shop"} className="hover:text-brand-blue">{item}</Link>
              <ChevronRight size={18} className="text-brand-subtle" />
            </span>
          ))}
          <span className="shrink-0 font-bold text-brand-ink">Checkout</span>
        </nav>

        <section className="relative mx-auto mt-24 min-h-[390px] max-w-[760px] overflow-hidden rounded-md bg-brand-peachLight px-8 py-16 text-center sm:mt-32 sm:px-12">
          <span className="absolute -top-3 left-[105px] h-12 w-12 rotate-45 bg-brand-blue" aria-hidden="true" />
          <span className="absolute -right-4 top-10 h-14 w-14 rounded-full border-[5px] border-brand-blue shadow-[inset_0_0_0_7px_theme(colors.brand.peachLight),inset_0_0_0_12px_theme(colors.brand.blue)]" aria-hidden="true" />
          <span className="absolute -left-5 bottom-72 h-10 w-10 rounded-md bg-brand-blue" aria-hidden="true" />
          <span className="absolute bottom-0 left-1/2 h-9 w-14 -translate-x-1/2 rounded-t-full bg-brand-blue" aria-hidden="true" />

          <h1 className="mt-1 text-h3 font-bold text-brand-ink">Your order is confirmed. Thank you!</h1>
          <div className="mx-auto mt-16 max-w-[640px] space-y-4 text-body leading-relaxed text-brand-text">
            <p>Your order has been placed successfully, and we&apos;ll start preparing it soon.</p>
            <p>With this purchase, you&apos;re not just buying a product — you&apos;re supporting independent artists and helping their creative work reach the world.</p>
            <p>Today, one designer is one step closer to their dream because of you. Thank you for being part of that.</p>
          </div>
          <div className="mt-14 flex flex-col items-center justify-between gap-5 text-left sm:flex-row">
            <p className="text-body text-brand-text">
              <span className="mr-2 inline-block h-4 w-6 rounded-b-full bg-brand-peach align-middle" aria-hidden="true" />
              You can track your delivery status anytime from your profile.
            </p>
            <Link href={receiptHref}>
              <Button variant="primaryBlue">View Receipt</Button>
            </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
