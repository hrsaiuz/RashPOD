import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams;
  const receiptHref = orderId ? `/account/orders/${encodeURIComponent(orderId)}` : "/account/orders";
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1232px] px-5 pb-24 pt-4">
        <nav className="inline-flex min-h-[39px] items-center gap-5 rounded-[9px] bg-brand-bg px-4 text-[18px] text-[#3B3B43]">
          {["Home", "Category", "Tshirts", "Products"].map((item) => (
            <span key={item} className="contents">
              <Link href={item === "Home" ? "/" : "/shop"}>{item}</Link>
              <ChevronRight size={21} strokeWidth={2.1} />
            </span>
          ))}
          <span className="font-bold text-[#33333A]">Checkout</span>
        </nav>

        <section className="relative mx-auto mt-32 min-h-[390px] max-w-[760px] overflow-hidden rounded-[10px] bg-[#FFD6C6] px-12 py-16 text-center">
          <span className="absolute -top-3 left-[105px] h-12 w-12 rotate-45 bg-brand-blue" />
          <span className="absolute -right-4 top-10 h-14 w-14 rounded-full border-[5px] border-brand-blue shadow-[inset_0_0_0_7px_#FFD6C6,inset_0_0_0_12px_#788AE0]" />
          <span className="absolute -left-5 bottom-72 h-10 w-10 rounded-[12px] bg-brand-blue" />
          <span className="absolute bottom-0 left-1/2 h-9 w-14 -translate-x-1/2 rounded-t-full bg-brand-blue" />

          <h1 className="mt-1 text-[18px] font-black text-black">Your order is confirmed. Thank you!</h1>
          <div className="mx-auto mt-16 max-w-[640px] space-y-4 text-[13px] leading-relaxed text-black">
            <p>Your order has been placed successfully, and we'll start preparing it soon.</p>
            <p>With this purchase, you're not just buying a product — you're supporting independent artists and helping their creative work reach the world.</p>
            <p>Today, one designer is one step closer to their dream because of you. Thank you for being part of that.</p>
          </div>
          <div className="mt-14 flex flex-col items-center justify-between gap-5 text-left sm:flex-row">
            <p className="text-[13px] text-black"><span className="mr-2 inline-block h-4 w-6 rounded-b-full bg-brand-peach align-middle" />You can track your delivery status anytime from your profile.</p>
            <Link href={receiptHref} className="inline-flex h-[39px] items-center rounded-[10px] bg-brand-blue px-7 text-[15px] font-bold text-white">
              View Receipt
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
