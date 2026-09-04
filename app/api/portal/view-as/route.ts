import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/portal/config";
import { VIEW_AS_COOKIE, VIEW_AS_SESSION_TTL_MS } from "@/lib/portal/effective-user";

export const runtime = "nodejs";

/**
 * Starts a "view as" preview: an institution_admin picks a real teacher/
 * student/guardian at their own institution and, from that point on, every
 * portal page/route this browser hits acts as that person — see
 * lib/portal/effective-user.ts. Fully interactive by design: writes made
 * during a preview are attributed to the person being previewed, not the
 * admin.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : null;
  const targetRole = body?.targetRole;
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : null;
  if (
    !targetUserId ||
    !institutionId ||
    (targetRole !== "teacher" && targetRole !== "student" && targetRole !== "guardian")
  ) {
    return json({ error: "bad_request" }, 400);
  }

  const admin = createAdminClient();
  const { data: adminMembership } = await admin
    .from("institution_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .in("role", ADMIN_ROLES as string[])
    .maybeSingle();
  if (!adminMembership) return json({ error: "forbidden" }, 403);

  const expiresAt = new Date(Date.now() + VIEW_AS_SESSION_TTL_MS).toISOString();
  const { data: session, error } = await admin
    .from("portal_view_as_sessions")
    .insert({
      admin_user_id: user.id,
      target_user_id: targetUserId,
      target_role: targetRole,
      institution_id: institutionId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !session) return json({ error: "server_error" }, 500);

  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VIEW_AS_SESSION_TTL_MS / 1000,
  });

  return json({ ok: true });
}

/** Ends the current preview, if any — idempotent, always succeeds. */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const jar = await cookies();
  const sessionId = jar.get(VIEW_AS_COOKIE)?.value;
  if (sessionId) {
    const admin = createAdminClient();
    await admin
      .from("portal_view_as_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("admin_user_id", user.id);
  }
  jar.delete(VIEW_AS_COOKIE);
  return json({ ok: true });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
