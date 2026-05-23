"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/auth-provider";
import { getDashboardHomePath } from "../../lib/dashboard-routes";

export default function DashboardIndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    router.replace(getDashboardHomePath(user.role));
  }, [user, isLoading, router]);

  return null;
}
