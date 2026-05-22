import { AnalyticsClient } from "../analytics-client";

export default function DesignerAnalyticsAdminPage() {
  return <AnalyticsClient title="Designer Analytics" description="Designer sales rankings, royalties, moderation funnel, published listings, payouts, and channel performance." endpoint="/admin/analytics/designers" reportType="designers" sensitive />;
}
