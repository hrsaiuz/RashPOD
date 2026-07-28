"use client";

import { useCallback, useMemo } from "react";
import { useToast } from "./toast-provider";

type FeedbackOptions = {
  title: string;
  description?: string;
};

type ErrorFeedbackOptions = {
  title: string;
  fallback: string;
};

export function dashboardErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function useDashboardFeedback() {
  const { toast } = useToast();

  const success = useCallback((options: FeedbackOptions) => {
    toast({ tone: "success", title: options.title, description: options.description });
  }, [toast]);

  const error = useCallback((cause: unknown, options: ErrorFeedbackOptions) => {
    const description = dashboardErrorMessage(cause, options.fallback);
    toast({ tone: "error", title: options.title, description });
    return description;
  }, [toast]);

  return useMemo(() => ({ success, error }), [error, success]);
}
