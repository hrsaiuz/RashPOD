export function OrganizationJsonLd({ brandName }: { brandName: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: brandName,
        url: baseUrl,
        email: "hello@rashpod.uz",
      },
      {
        "@type": "WebSite",
        name: brandName,
        url: baseUrl,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
