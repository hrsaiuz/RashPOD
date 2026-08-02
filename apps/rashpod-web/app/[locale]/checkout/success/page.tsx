import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { PageContainer } from "@rashpod/ui";
import CheckoutSuccessClient from "./CheckoutSuccessClient";
import { Link } from "../../../../i18n/navigation";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentId?: string }>;
}) {
  const { orderId, paymentId } = await searchParams;
  const t = await getTranslations("checkoutSuccess");
  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-24 pt-4">
        <nav aria-label="Breadcrumb" className="inline-flex min-h-10 items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
          <Link href="/" className="hover:text-brand-blue">{t("home")}</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
          <Link href="/shop" className="hover:text-brand-blue">{t("shop")}</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
          <span className="shrink-0 font-bold text-brand-ink">{t("checkout")}</span>
        </nav>
        <CheckoutSuccessClient orderId={orderId} paymentId={paymentId} />
      </PageContainer>
    </div>
  );
}
