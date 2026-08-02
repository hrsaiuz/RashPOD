export async function revalidateStorefrontBranding() {
  const response = await fetch("/api/revalidate-storefront/branding", { method: "POST" }).catch(() => null);
  return response?.ok ?? false;
}
