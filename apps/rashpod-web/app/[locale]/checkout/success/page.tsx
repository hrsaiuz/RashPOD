import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageContainer } from "@rashpod/ui";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentId?: string }>;
}) {
  const { orderId, paymentId } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-24 pt-4">
        <nav aria-label="Breadcrumb" className="inline-flex min-h-10 items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
          <Link href="/" className="hover:text-brand-blue">Home</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
          <Link href="/shop" className="hover:text-brand-blue">Shop</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
          <span className="shrink-0 font-bold text-brand-ink">Checkout</span>
        </nav>
        <CheckoutSuccessClient orderId={orderId} paymentId={paymentId} />
      </PageContainer>
    </div>
  );
}
