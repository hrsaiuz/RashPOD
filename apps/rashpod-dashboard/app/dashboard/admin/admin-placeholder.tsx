"use client";

import { Card } from "@rashpod/ui";
import DashboardLayout from "../dashboard-layout";

export default function AdminPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">{title}</h1>
          <p className="text-brand-muted mt-1">{description}</p>
        </div>
        <Card>
          <p className="text-sm text-brand-muted">
            This admin workspace is reserved in the RashPOD operating platform and will use the shared dashboard shell,
            audit logging, and role controls as the feature is filled in.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}