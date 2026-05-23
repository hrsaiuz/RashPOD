"use client";

import { Button } from "@rashpod/ui";

export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <h1 className="text-h3 font-bold text-brand-ink">Account error</h1>
      <p className="mt-3 text-brand-muted">We could not load your account area.</p>
      <Button className="mt-6" variant="primaryBlue" onClick={reset}>Try again</Button>
    </div>
  );
}
