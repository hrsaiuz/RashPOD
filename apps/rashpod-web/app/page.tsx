export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "64px 20px" }}>
      <h1 style={{ fontSize: 44, marginBottom: 12 }}>Upload your designs. Sell products. Earn royalties.</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate merchandise opportunities.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <a href="/auth/register" style={{ background: "#F39E7C", color: "white", padding: "12px 20px", borderRadius: 999, textDecoration: "none" }}>
          Start selling your designs
        </a>
        <a href="/shop" style={{ background: "#788AE0", color: "white", padding: "12px 20px", borderRadius: 999, textDecoration: "none" }}>
          Open RashPOD Shop
        </a>
      </div>
    </main>
  );
}
