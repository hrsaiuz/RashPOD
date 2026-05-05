"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Package, TruckIcon, CheckCircle, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CustomerKpis {
  totalOrders: number;
  inTransit: number;
  delivered: number;
  savedItems: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function CustomerOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<CustomerKpis | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/customer");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/customer/kpis");
        // const ordersRes = await fetch("/api/proxy/customer/orders?limit=5");
        
        // Mock data for now
        setKpis({
          totalOrders: 12,
          inTransit: 2,
          delivered: 9,
          savedItems: 5,
        });
        setRecentOrders([
          { id: "1", orderNumber: "ORD-001", status: "delivered", total: 45.99, createdAt: "2025-01-10" },
          { id: "2", orderNumber: "ORD-002", status: "in_transit", total: 32.50, createdAt: "2025-01-15" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const orderColumns: DataTableColumn<RecentOrder>[] = [
    { key: "orderNumber", header: "Order #", sortable: true },
    { 
      key: "status", 
      header: "Status",
      render: (val) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blueLight text-brand-blue">
          {val}
        </span>
      ),
    },
    { 
      key: "total", 
      header: "Total",
      render: (val) => `$${val.toFixed(2)}`,
    },
    { 
      key: "createdAt", 
      header: "Date",
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <Link href={`/dashboard/customer/orders/${row.id}`} className="text-brand-blue hover:underline text-sm">
          View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout role="customer">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Welcome back!</h1>
          <p className="text-brand-muted">Here's your order summary and activity.</p>
        </div>

        {error && (
          <ErrorState
            title="Failed to load dashboard"
            description={error}
            retry={
              <Button onClick={() => window.location.reload()} variant="primaryBlue">
                Retry
              </Button>
            }
          />
        )}

        {!error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : kpis ? (
                <>
                  <KpiTile label="Total Orders" value={kpis.totalOrders} icon={<Package size={24} />} />
                  <KpiTile label="In Transit" value={kpis.inTransit} icon={<TruckIcon size={24} />} />
                  <KpiTile label="Delivered" value={kpis.delivered} icon={<CheckCircle size={24} />} />
                  <KpiTile label="Saved Items" value={kpis.savedItems} icon={<Heart size={24} />} />
                </>
              ) : null}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Recent Orders</h2>
                <Link href="/dashboard/customer/orders">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <DataTable
                columns={orderColumns}
                rows={recentOrders}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No orders yet"
                    description="Start shopping to see your orders here."
                    action={
                      <Link href="/dashboard/customer/shop">
                        <Button variant="primaryBlue">Browse Shop</Button>
                      </Link>
                    }
                  />
                }
              />
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-blueLight rounded-xl">
                  <ShoppingBag className="text-brand-blue" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-ink mb-2">Continue Shopping</h3>
                  <p className="text-sm text-brand-muted mb-4">
                    Browse our collection of custom-designed products and find something unique.
                  </p>
                  <Link href="/dashboard/customer/shop">
                    <Button variant="primaryBlue">Browse Products</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
