"use client";

import DashboardLayout from "../../dashboard-layout";
import { IntakeAdminTable } from "../intake-admin-table";

export default function AdminDesignerApplicationsPage() {
  return (
    <DashboardLayout role="admin">
      <IntakeAdminTable
        kind="designer-applications"
        title="Designer Applications"
        description="Review public designer applications before manually approving accounts or onboarding steps."
        emptyTitle="No designer applications yet"
      />
    </DashboardLayout>
  );
}
