import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client: bypasses RLS entirely. Server-only (the
 * "server-only" import throws if this is ever pulled into a client bundle).
 *
 * Pattern used throughout this starter: most portal reads/writes go through
 * Route Handlers (or Server Components) that use THIS client, then
 * re-implement the authorization check in plain TypeScript (see
 * lib/portal/access.ts, lib/portal/effective-user.ts) rather than relying on
 * Postgres RLS policies to arbitrate every write. RLS is still enabled on
 * the tables that have client-facing policies (see supabase/schema.sql) as
 * defense in depth, but this app never assumes RLS alone is enough for
 * anything financial (tuition) or identity-sensitive ("view as").
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill in your own Supabase project's values.",
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
