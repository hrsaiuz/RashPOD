import { AnalyticsClient } from "../analytics-client";

export default function MarketplaceAnalyticsPage() {
  return <AnalyticsClient title="Marketplace Analytics" description="Manual export readiness, blocked candidates, exported listings, external sales, mapping gaps, and failed batches." endpoint="/admin/analytics/marketplace" reportType="marketplace" />;
}
