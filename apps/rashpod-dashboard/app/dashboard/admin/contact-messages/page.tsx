"use client";

import DashboardLayout from "../../dashboard-layout";
import { IntakeAdminTable } from "../intake-admin-table";

export default function AdminContactMessagesPage() {
  return (
    <DashboardLayout role="admin">
      <IntakeAdminTable
        kind="contact-messages"
        title="Contact Messages"
        description="Track storefront contact form submissions from customers, designers, partners, and film buyers."
        emptyTitle="No contact messages yet"
      />
    </DashboardLayout>
  );
}
