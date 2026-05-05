"use client";

import { useEffect } from "react";
import { ErrorState, Button } from "@rashpod/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description={error.message || "An unexpected error occurred."}
        retry={
          <Button onClick={reset} variant="primaryBlue">
            Try Again
          </Button>
        }
      />
    </div>
  );
}
