"use client";

import { useEffect } from "react";
import { DesignersPageError } from "./DesignersPageClient";

export default function DesignersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Designers page error:", error);
  }, [error]);

  return <DesignersPageError reset={reset} />;
}
