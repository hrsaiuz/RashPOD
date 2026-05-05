"use client";

import * as React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ChartWrapperProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  title?: string;
  className?: string;
  color?: "blue" | "peach" | "success" | "warning";
}

export function ChartWrapper({ data, dataKey, xAxisKey, title, className, color = "blue" }: ChartWrapperProps) {
  const colors = {
    blue: "#788AE0",
    peach: "#F39E7C",
    success: "#12B76A",
    warning: "#F79009",
  };

  return (
    <div className={cn("bg-surface-card border border-surface-border-soft rounded-2xl p-6 shadow-sm w-full h-[360px] flex flex-col", className)}>
      {title && <h3 className="text-lg font-semibold text-brand-ink mb-6">{title}</h3>}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F6" />
            <XAxis 
              dataKey={xAxisKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
            />
            <Tooltip 
              cursor={{ fill: '#F0F2FA' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(16, 24, 40, 0.06)' }}
              itemStyle={{ color: '#1A1D2E', fontWeight: 600 }}
            />
            <Bar dataKey={dataKey} fill={colors[color]} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
