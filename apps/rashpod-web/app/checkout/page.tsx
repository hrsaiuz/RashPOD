import { redirect } from "next/navigation";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://rashpod-dashboard-6533fe6ega-uc.a.run.app";

export default function CheckoutPage() {
  redirect(`${DASHBOARD_URL}/dashboard/customer/checkout?from=web`);
}
