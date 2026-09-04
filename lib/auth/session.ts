import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user for the current request, or null. Minimal equivalent
 * of a production app's session-lookup helper — every portal page and API
 * route calls this first, then (if a user is present) resolves the
 * "effective" user via lib/portal/effective-user.ts before doing anything
 * role-specific.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
