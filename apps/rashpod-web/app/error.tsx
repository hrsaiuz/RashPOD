"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@rashpod/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-20">
      <ErrorState
        title="Something went wrong"
        description="We encountered an unexpected error. Please try again."
        retry={
          <Button variant="primaryBlue" size="md" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
