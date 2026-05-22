import { AnalyticsClient } from "../../admin/analytics/analytics-client";

export default function DesignerAnalyticsPage() {
  return <AnalyticsClient role="designer" title="My Analytics" description="Your sales, royalties, top listings, moderation funnel, payout history, and allowed channel breakdown." endpoint="/designer/analytics" reportType="designers" />;
}
