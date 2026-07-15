import CustomOrderPageClient from "./CustomOrderPageClient";
import { getShopSettings } from "../../../lib/shop-settings";
import { getStorefrontBranding } from "../../../lib/branding";

export default async function CustomOrderPage() {
  const [shopSettings, branding] = await Promise.all([getShopSettings(), getStorefrontBranding()]);
  return <CustomOrderPageClient shopSettings={shopSettings} productTypes={branding?.customOrderProductTypes ?? []} />;
}
