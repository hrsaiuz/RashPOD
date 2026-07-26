import { ReactNode } from "react";
import DashboardLayout from "../dashboard-layout";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout role="super-admin">{children}</DashboardLayout>;
}
