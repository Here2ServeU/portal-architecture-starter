"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !email) return;
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", padding: "100px 24px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Sign in</h1>
      <p style={{ color: "var(--ps-muted)", marginBottom: 24, fontSize: "0.9rem" }}>
        We&apos;ll email you a magic link — no password needed. This uses Supabase Auth directly; see
        lib/supabase/client.ts.
      </p>
      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={sendMagicLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--ps-border)", borderRadius: 8, font: "inherit" }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              background: "var(--ps-accent)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {sending ? "Sending…" : "Send magic link"}
          </button>
          {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
        </form>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
