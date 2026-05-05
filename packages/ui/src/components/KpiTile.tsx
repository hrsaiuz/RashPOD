"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface KpiTileProps {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  delta,
  icon,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "bg-white rounded-2xl p-6 shadow-soft border border-surface-borderSoft",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-brand-muted">{label}</p>
        {icon && <div className="text-brand-blue">{icon}</div>}
      </div>
      <div className="flex items-end gap-3">
        <p className="text-3xl font-bold text-brand-ink">{value}</p>
        {delta && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium pb-1",
            delta.isPositive ? "text-semantic-success" : "text-semantic-danger"
          )}>
            {delta.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(delta.value)}%
          </div>
        )}
      </div>
    </motion.div>
  );
};
KpiTile.displayName = "KpiTile";
