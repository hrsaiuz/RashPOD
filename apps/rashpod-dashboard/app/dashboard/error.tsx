"use client";

import { useEffect } from "react";
import { ErrorState, Button } from "@rashpod/ui";

export default function DashboardError({
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
        title="Dashboard Error"
        description={error.message || "Failed to load dashboard. Please try again."}
        retry={
          <Button onClick={reset} variant="primaryBlue">
            Reload Dashboard
          </Button>
        }
      />
    </div>
  );
}
