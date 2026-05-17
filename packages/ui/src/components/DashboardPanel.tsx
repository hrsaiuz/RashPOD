import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DashboardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: React.ReactNode;
}

export function DashboardPanel({ title, action, className, children, ...props }: DashboardPanelProps) {
  return (
    <div
      className={cn(
        "bg-white/95 border border-surface-borderSoft rounded-2xl shadow-soft overflow-hidden",
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-borderSoft bg-gradient-to-b from-white to-surface-app">
          {title && <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}
