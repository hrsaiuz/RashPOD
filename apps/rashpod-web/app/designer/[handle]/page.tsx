import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

async function getDesignerShop(handle: string) {
  const res = await fetch(`${API_URL}/shop/designers/${encodeURIComponent(handle)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function DesignerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const payload = await getDesignerShop(handle);
  if (!payload) {
    return (
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
        <h1>Designer not found</h1>
        <Link href="/shop">Back to shop</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      <h1>{payload.designer.displayName}</h1>
      <p>Designer shop profile</p>
      <p>
        Handle: <strong>{payload.designer.handle}</strong>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {payload.listings.map((l: any) => (
          <div key={l.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 16, padding: 12 }}>
            <h3>{l.title}</h3>
            <p>
              {l.type} · {l.price} {l.currency}
            </p>
            <Link href={`/product/${l.slug}`}>Open</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
