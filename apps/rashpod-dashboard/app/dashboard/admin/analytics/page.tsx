import { AnalyticsClient } from "./analytics-client";

export default function AdminAnalyticsOverviewPage() {
  return <AnalyticsClient title="Executive Analytics" description="Sales, production, finance, marketplace, film, AI, and warning signals for RashPOD owners and admins." endpoint="/admin/analytics/overview" reportType="sales" sensitive />;
}
