"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses the anon key + the signed-in user's own
 * session, so it is subject to RLS. Used by client components for auth
 * actions (sign in/out) and for the two-step direct-to-storage upload
 * pattern (see components/portal/LogoUpload.tsx).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
