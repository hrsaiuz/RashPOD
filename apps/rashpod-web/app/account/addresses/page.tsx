"use client";

import { Card, EmptyState } from "@rashpod/ui";

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Addresses</h1>
      <Card>
        <div className="p-1">
          <EmptyState
            title="No addresses saved"
            description="Add a delivery address during your next checkout."
          />
        </div>
      </Card>
    </div>
  );
}
