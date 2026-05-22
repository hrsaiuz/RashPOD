import { AnalyticsClient } from "../analytics-client";

export default function FinanceAnalyticsPage() {
  return <AnalyticsClient title="Finance Analytics" description="Revenue, royalties, payouts, margin estimates, missing-cost warnings, and payment reconciliation issues." endpoint="/admin/analytics/finance" reportType="finance" sensitive />;
}
