import { AnalyticsClient } from "../analytics-client";

export default function SalesAnalyticsPage() {
  return <AnalyticsClient title="Sales Analytics" description="Paid revenue, order trends, product/listing/designer rankings, and direct versus external channel performance." endpoint="/admin/analytics/sales" reportType="sales" />;
}
