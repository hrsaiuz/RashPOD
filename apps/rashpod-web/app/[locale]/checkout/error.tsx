"use client";

import { Button } from "@rashpod/ui";

export default function CheckoutError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-storefront px-6 py-20 text-center">
      <h1 className="text-h3 font-bold text-brand-ink">Checkout error</h1>
      <p className="mt-3 text-brand-muted">Something went wrong while loading checkout.</p>
      <Button className="mt-6" variant="primaryPeach" onClick={reset}>Try again</Button>
    </div>
  );
}
