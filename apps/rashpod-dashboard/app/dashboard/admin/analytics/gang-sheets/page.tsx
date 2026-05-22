import { AnalyticsClient } from "../analytics-client";

export default function GangSheetAnalyticsPage() {
  return <AnalyticsClient title="Gang Sheet Analytics" description="Gang sheet orders, revenue, utilization, status mix, and production file failure signals." endpoint="/admin/analytics/gang-sheets" reportType="gang-sheets" />;
}
