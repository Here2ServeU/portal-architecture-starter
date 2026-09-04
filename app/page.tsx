import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>Portal Architecture Starter</h1>
      <p style={{ color: "var(--ps-muted)", lineHeight: 1.7, marginBottom: 32 }}>
        A minimal, working example of a multi-tenant institution portal: admins, teachers, students, and guardians
        each get a role-specific dashboard behind the same shared shell, with a real &quot;view as&quot; preview
        pattern. See the README for the architecture write-up and setup instructions.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link
          href="/login"
          style={{
            background: "var(--ps-accent)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
      <p style={{ color: "var(--ps-muted)", marginTop: 24, fontSize: "0.85rem" }}>
        After signing in, visit <code>/portal/&lt;your-institution-slug&gt;</code> — try{" "}
        <code>/portal/riverside-academy</code> if you ran <code>seed.sql</code>.
      </p>
    </main>
  );
}
