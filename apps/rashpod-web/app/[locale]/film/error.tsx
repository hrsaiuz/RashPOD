"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@rashpod/ui";

export default function FilmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Film page error:", error);
  }, [error]);

  return (
    <div className="max-w-storefront mx-auto px-6 py-20">
      <ErrorState
        title="Failed to load films"
        description="We couldn't load the film catalog. Please try again."
        retry={
          <Button variant="primaryBlue" size="md" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
