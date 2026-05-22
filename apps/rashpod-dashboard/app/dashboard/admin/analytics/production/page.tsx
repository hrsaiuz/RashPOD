import { AnalyticsClient } from "../analytics-client";

export default function ProductionAnalyticsPage() {
  return <AnalyticsClient title="Production Analytics" description="Queue health, lead times, QC rates, blockers, overdue items, failed files, and operator workload." endpoint="/admin/analytics/production" reportType="production" />;
}
