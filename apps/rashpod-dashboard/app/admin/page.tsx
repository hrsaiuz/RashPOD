"use client";

import { MetricCard, ChartWrapper, DashboardPanel } from "@rashpod/ui";
import { DollarSign, ShoppingCart, Users, Image as ImageIcon } from "lucide-react";

const mockRevenueData = [
  { month: "Jan", revenue: 4000 },
  { month: "Feb", revenue: 5500 },
  { month: "Mar", revenue: 4800 },
  { month: "Apr", revenue: 7200 },
  { month: "May", revenue: 8500 },
  { month: "Jun", revenue: 10200 },
];

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-ink">Platform Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value="124.5M UZS" trend={12.5} icon={<DollarSign />} />
        <MetricCard title="Active Orders" value="342" trend={8.2} icon={<ShoppingCart />} />
        <MetricCard title="New Designers" value="48" trend={-2.4} icon={<Users />} />
        <MetricCard title="Film Sales" value="890 m²" trend={18.1} icon={<ImageIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartWrapper 
            title="Revenue Growth" 
            data={mockRevenueData} 
            dataKey="revenue" 
            xAxisKey="month" 
            color="blue" 
          />
        </div>
        <div className="lg:col-span-1">
          <DashboardPanel title="Recent Activity" className="h-[360px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-surface-border-soft last:border-0">
                  <div className="w-10 h-10 rounded-full bg-brand-bg flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">Order #10{i} placed</p>
                    <p className="text-xs text-brand-muted">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
