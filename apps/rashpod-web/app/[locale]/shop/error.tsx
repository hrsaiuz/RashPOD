"use client";

import { Button } from "@rashpod/ui";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-storefront px-6 py-20 text-center">
      <h1 className="text-h3 font-bold text-brand-ink">Shop unavailable</h1>
      <p className="mt-3 text-brand-muted">We could not load the shop right now.</p>
      <Button className="mt-6" variant="primaryBlue" onClick={reset}>Try again</Button>
    </div>
  );
}
