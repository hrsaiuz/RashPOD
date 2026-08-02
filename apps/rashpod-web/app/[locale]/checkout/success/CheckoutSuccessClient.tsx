"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ErrorState, Skeleton, DecoratedPanel } from "@rashpod/ui";
import { api, type Order } from "../../../../lib/api";
import { Link } from "../../../../i18n/navigation";

export default function CheckoutSuccessClient({ orderId, paymentId }: { orderId?: string; paymentId?: string }) {
  const t = useTranslations("checkoutSuccess");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function verify() {
      try {
        const data = await api.get<Order>(`/customer/orders/${orderId}`);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("verifyError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  if (loading) return <Skeleton className="mx-auto mt-24 h-64 max-w-[760px]" />;
  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-[760px]">
        <ErrorState title={t("confirmErrorTitle")} description={error} retry={<Link href="/account/orders"><Button variant="primaryBlue">{t("viewOrders")}</Button></Link>} />
      </div>
    );
  }

  const failed = order && ["PAYMENT_FAILED", "CANCELED"].includes(order.status);
  const pending = order && ["PAYMENT_PENDING", "DRAFT"].includes(order.status);

  return (
    <DecoratedPanel dark={!failed && !pending} className="mx-auto mt-12 min-h-[430px] max-w-[980px] px-7 py-16 text-center sm:mt-20 sm:px-12">
      <div role="status" aria-live="polite" className="mx-auto flex min-h-[300px] max-w-[720px] flex-col items-center justify-center">
      <h1 className={`text-h3 font-bold ${failed || pending ? "text-brand-ink" : "text-white"}`}>
        {failed ? t("failedTitle") : pending ? t("pendingTitle") : t("confirmedTitle")}
      </h1>
      <div className={`mx-auto mt-10 max-w-[640px] space-y-4 text-body leading-relaxed ${failed || pending ? "text-brand-text" : "text-white/90"}`}>
        {failed ? (
          <p>{t("failedDescription")}</p>
        ) : pending ? (
          <p>{t("pendingDescription", { paymentRef: paymentId ? paymentId.slice(0, 8) : "none" })}</p>
        ) : (
          <>
            <p>{t("successDescription")}</p>
            <p>{t("artistSupport")}</p>
          </>
        )}
      </div>
      <div className="mt-10">
        <Link href={orderId ? `/account/orders/${encodeURIComponent(orderId)}` : "/account/orders"}>
          <Button variant="primaryBlue">{failed ? t("retryFromAccount") : t("viewReceipt")}</Button>
        </Link>
      </div>
      </div>
    </DecoratedPanel>
  );
}
