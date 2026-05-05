import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "80px 20px 64px" }}>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", marginBottom: 12, lineHeight: 1.15, color: "#1A1D2E" }}>
        Upload your designs.<br />Sell products. Earn royalties.
      </h1>
      <p style={{ fontSize: "clamp(15px, 2vw, 18px)", marginBottom: 32, color: "#4B5563", maxWidth: 560 }}>
        Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate merchandise opportunities.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/auth/register" style={{ background: "#F39E7C", color: "white", padding: "14px 24px", borderRadius: 999, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
          Start selling your designs
        </Link>
        <Link href="/shop" style={{ background: "#788AE0", color: "white", padding: "14px 24px", borderRadius: 999, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
          Open RashPOD Shop
        </Link>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 64 }}>
        {[
          { icon: "🎨", title: "Upload once", desc: "Upload your design file once and apply it to any product." },
          { icon: "🛒", title: "Auto listings", desc: "We generate product mockups and create your shop listing automatically." },
          { icon: "💸", title: "Earn royalties", desc: "Get paid every time someone buys a product featuring your design." },
          { icon: "🎞️", title: "DTF / UV Films", desc: "Enable film sales and reach print shops across Uzbekistan." },
        ].map((f) => (
          <div key={f.title} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(120,138,224,0.08)", border: "1px solid #E8EAFB" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#1A1D2E" }}>{f.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
