"use client";

import * as React from "react";
import { Badge } from "./BadgeNew";

type BadgeVariant = "blue" | "peach" | "gray" | "green" | "red" | "yellow";

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  // Design / listing lifecycle
  draft: { label: "Draft", variant: "gray" },
  submitted: { label: "Submitted", variant: "blue" },
  needs_fix: { label: "Needs fix", variant: "yellow" },
  approved: { label: "Approved", variant: "green" },
  rejected: { label: "Rejected", variant: "red" },
  suspended: { label: "Suspended", variant: "red" },
  ready_for_mockup: { label: "Ready for mockup", variant: "blue" },
  ready_to_publish: { label: "Ready to publish", variant: "blue" },
  published: { label: "Published", variant: "blue" },
  film_enabled: { label: "Film enabled", variant: "peach" },

  // Production lifecycle
  ordered: { label: "Ordered", variant: "gray" },
  file_check: { label: "File check", variant: "blue" },
  ready_for_print: { label: "Ready for print", variant: "blue" },
  printing: { label: "Printing", variant: "blue" },
  qc: { label: "Quality control", variant: "yellow" },
  packing: { label: "Packing", variant: "blue" },
  ready_for_pickup: { label: "Ready for pickup", variant: "yellow" },
  delivered: { label: "Delivered", variant: "green" },

  // Order / payment
  pending: { label: "Pending", variant: "gray" },
  paid: { label: "Paid", variant: "green" },
  in_transit: { label: "In transit", variant: "blue" },
  cancelled: { label: "Cancelled", variant: "red" },
  refunded: { label: "Refunded", variant: "yellow" },
  failed: { label: "Failed", variant: "red" },
};

export interface StatusBadgeProps {
  status: string;
  /** Override the label rendered while keeping the colour mapping. */
  label?: string;
  className?: string;
}

/**
 * Tokenised status pill. Always pair colour + label so the status is
 * never communicated by colour alone (Skill §1 `color-not-only`).
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = String(status || "").toLowerCase().replace(/[-\s]/g, "_");
  const meta = STATUS_MAP[key] ?? { label: status, variant: "gray" as BadgeVariant };
  return (
    <Badge variant={meta.variant} className={className} aria-label={`Status: ${label ?? meta.label}`}>
      {label ?? meta.label}
    </Badge>
  );
}
