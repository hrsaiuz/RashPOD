import { AnalyticsClient } from "../analytics-client";

export default function FilmAnalyticsPage() {
  return <AnalyticsClient title="Film Analytics" description="DTF and UV-DTF film orders, custom versus designer film revenue, film royalties, and sales breakdowns." endpoint="/admin/analytics/film" reportType="film" />;
}
