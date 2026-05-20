"use client";

import DashboardLayout from "../../dashboard-layout";
import { IntakeAdminTable } from "../intake-admin-table";

export default function AdminCustomOrderRequestsPage() {
  return (
    <DashboardLayout role="admin">
      <IntakeAdminTable
        kind="custom-order-requests"
        title="Custom Requests"
        description="Review custom order briefs submitted from the public custom order page."
        emptyTitle="No custom order requests yet"
      />
    </DashboardLayout>
  );
}
