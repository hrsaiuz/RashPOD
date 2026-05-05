const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

async function getListing(slug: string) {
  const res = await fetch(`${API_URL}/shop/listings/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Listing not found</h1>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>{listing.title}</h1>
      <p>{listing.description || "No description"}</p>
      <p>
        {listing.type} · {listing.price} {listing.currency}
      </p>
      <p>Slug: {listing.slug}</p>
      <a href="/checkout">Go to checkout</a>
    </main>
  );
}
