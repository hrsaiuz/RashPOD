import CustomOrderPageClient from "./CustomOrderPageClient";
import { getShopSettings } from "../../../lib/shop-settings";

export default async function CustomOrderPage() {
  const shopSettings = await getShopSettings();
  return <CustomOrderPageClient shopSettings={shopSettings} />;
}
