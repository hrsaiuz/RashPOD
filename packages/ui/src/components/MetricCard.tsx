"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TrendingUp, TrendingDown } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number; // Positive or negative percentage
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, trend, icon, className }: MetricCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "bg-surface-card border border-surface-border-soft rounded-2xl p-5 shadow-sm flex flex-col gap-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-brand-muted">{title}</h3>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-brand-ink">{value}</span>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center text-sm font-medium pb-1",
            isPositive ? "text-semantic-success" : isNegative ? "text-semantic-danger" : "text-brand-muted"
          )}>
            {isPositive && <TrendingUp className="w-4 h-4 mr-1" />}
            {isNegative && <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
