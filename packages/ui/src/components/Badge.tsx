import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: "draft" | "submitted" | "approved" | "rejected" | "needsFix" | "published" | "filmEnabled";
}

export function Badge({ className, status = "draft", children, ...props }: BadgeProps) {
  const statusStyles = {
    draft: "bg-semantic-pending-bg text-semantic-pending-text",
    submitted: "bg-semantic-info-bg text-semantic-info-text",
    approved: "bg-semantic-success-bg text-semantic-success-text",
    rejected: "bg-semantic-danger-bg text-semantic-danger-text",
    needsFix: "bg-semantic-warning-bg text-semantic-warning-text",
    published: "bg-[#EEF1FF] text-[#5B6FD8]",
    filmEnabled: "bg-[#FFF1E8] text-[#C85F35]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center h-7 px-3 text-xs rounded-full font-medium",
        statusStyles[status],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
