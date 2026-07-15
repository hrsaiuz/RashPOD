export async function revalidateStorefrontBranding() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const secret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret) return;
  await fetch(`${webUrl.replace(/\/$/, "")}/api/revalidate/branding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => undefined);
}
