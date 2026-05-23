"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, ErrorState, Skeleton } from "@rashpod/ui";
import { api, type Order } from "../../../../lib/api";

export default function CheckoutSuccessClient({ orderId, paymentId }: { orderId?: string; paymentId?: string }) {
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
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not verify order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) return <Skeleton className="mx-auto mt-24 h-64 max-w-[760px]" />;
  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-[760px]">
        <ErrorState title="We could not confirm your payment yet" description={error} retry={<Link href="/account/orders"><Button variant="primaryBlue">View orders</Button></Link>} />
      </div>
    );
  }

  const failed = order && ["PAYMENT_FAILED", "CANCELED"].includes(order.status);
  const pending = order && ["PAYMENT_PENDING", "DRAFT"].includes(order.status);

  return (
    <section className="relative mx-auto mt-24 min-h-[390px] max-w-[760px] overflow-hidden rounded-md bg-brand-peachLight px-8 py-16 text-center sm:mt-32 sm:px-12">
      <h1 className="mt-1 text-h3 font-bold text-brand-ink">
        {failed ? "Payment was not completed" : pending ? "Payment is still processing" : "Your order is confirmed. Thank you!"}
      </h1>
      <div className="mx-auto mt-10 max-w-[640px] space-y-4 text-body leading-relaxed text-brand-text">
        {failed ? (
          <p>Your order was created, but payment did not complete. You can retry payment from your account.</p>
        ) : pending ? (
          <p>We created your order{paymentId ? ` (${paymentId.slice(0, 8)})` : ""} and are waiting for payment confirmation.</p>
        ) : (
          <>
            <p>Your order has been placed successfully, and we&apos;ll start preparing it soon.</p>
            <p>With this purchase, you&apos;re supporting independent artists and helping their creative work reach the world.</p>
          </>
        )}
      </div>
      <div className="mt-10">
        <Link href={orderId ? `/account/orders/${encodeURIComponent(orderId)}` : "/account/orders"}>
          <Button variant="primaryBlue">{failed ? "Retry from account" : "View receipt"}</Button>
        </Link>
      </div>
    </section>
  );
}
