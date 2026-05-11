"use client";

import Link from "next/link";
import { Card, Button, EmptyState } from "@rashpod/ui";

export default function WishlistPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Wishlist</h1>
      <Card>
        <div className="p-1">
          <EmptyState
            title="Your wishlist is empty"
            description="Save items you love by tapping the heart on any product."
            action={<Link href="/shop"><Button variant="primaryBlue">Browse shop</Button></Link>}
          />
        </div>
      </Card>
    </div>
  );
}
