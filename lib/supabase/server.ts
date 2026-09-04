import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side Supabase client bound to the current request's cookies. Used
 * in Server Components / Route Handlers to read the signed-in user's own
 * session (via supabase.auth.getUser()). Still subject to RLS — this is NOT
 * the admin/service-role client (see lib/supabase/admin.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies (e.g.
            // during a plain page render, not a Server Action / Route
            // Handler) — safe to ignore as long as middleware refreshes the
            // session, which this starter doesn't need since sessions are
            // read fresh on every request via getSessionUser().
          }
        },
      },
    },
  );
}
