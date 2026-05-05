const roles = [
  "customer",
  "designer",
  "corporate",
  "moderator",
  "production",
  "admin",
  "super-admin",
];

export default function DashboardHome() {
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px" }}>
      <h1>RashPOD Dashboards</h1>
      <p>Role route groups are scaffolded for MVP service boundaries.</p>
      <ul>
        {roles.map((role) => (
          <li key={role}>
            <a href={`/dashboard/${role}`}>/dashboard/{role}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
