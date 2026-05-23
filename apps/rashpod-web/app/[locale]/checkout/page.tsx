import CheckoutPageClient from "./CheckoutPageClient";
import { getShopSettings } from "../../../lib/shop-settings";

export default async function CheckoutPage() {
  const shopSettings = await getShopSettings();
  return <CheckoutPageClient shopSettings={shopSettings} />;
}
