import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "./config";

export const VIEW_AS_COOKIE = "portal_view_as";
export const VIEW_AS_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export type ViewAsRole = "teacher" | "student" | "guardian";

export type ViewAsInfo = {
  sessionId: string;
  targetUserId: string;
  targetRole: ViewAsRole;
  institutionId: string;
};

export type EffectivePortalUser = {
  effectiveUserId: string;
  viewAs: ViewAsInfo | null;
};

/**
 * Resolves which identity a portal request should act as: the real
 * signed-in user, or — if a valid "view as" session is active AND the real
 * user is STILL an institution_admin there (re-checked fresh on every call
 * against institution_memberships, never cached or trusted from the stored
 * session row) — the person being previewed.
 *
 * Every portal page and API route calls this immediately after
 * getSessionUser() and uses `effectiveUserId` everywhere `user.id` was used
 * before, for BOTH identity lookups (getTeacher/getStudent/...) and
 * authorization checks — this is what makes "view as" fully interactive: an
 * admin previewing as a real teacher can save changes, upload materials,
 * send messages exactly as that teacher, because every check below sees the
 * teacher's own identity, not the admin's.
 *
 * The security-relevant part: the httpOnly cookie holds only an opaque
 * session id, never a signed claim of "who this is". A tampered cookie
 * value just fails the row lookup below. And even a genuine, unexpired
 * session is discarded if the admin's OWN institution_memberships row is
 * gone or demoted since the session started — an admin who gets demoted
 * mid-preview immediately loses the ability to act as anyone else, on the
 * very next request, without needing to separately revoke the cookie.
 */
export async function getEffectivePortalUser(realUserId: string): Promise<EffectivePortalUser> {
  const jar = await cookies();
  const sessionId = jar.get(VIEW_AS_COOKIE)?.value;
  if (!sessionId) return { effectiveUserId: realUserId, viewAs: null };

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("portal_view_as_sessions")
    .select("id, admin_user_id, target_user_id, target_role, institution_id, expires_at, ended_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (
    !session ||
    session.ended_at ||
    session.admin_user_id !== realUserId ||
    new Date(session.expires_at).getTime() < Date.now()
  ) {
    return { effectiveUserId: realUserId, viewAs: null };
  }

  const { data: adminMembership } = await admin
    .from("institution_memberships")
    .select("id")
    .eq("user_id", realUserId)
    .eq("institution_id", session.institution_id)
    .in("role", ADMIN_ROLES as string[])
    .maybeSingle();
  if (!adminMembership) return { effectiveUserId: realUserId, viewAs: null };

  return {
    effectiveUserId: session.target_user_id,
    viewAs: {
      sessionId: session.id,
      targetUserId: session.target_user_id,
      targetRole: session.target_role as ViewAsRole,
      institutionId: session.institution_id,
    },
  };
}
