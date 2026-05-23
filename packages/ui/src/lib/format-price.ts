/** Format price in UZS (RashPOD default storefront currency). */
export function formatPrice(amount: number, currency = "UZS"): string {
  const formatted = amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${formatted} ${currency}`;
}
