import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/portal/config";

export const runtime = "nodejs";

const BUCKET = "institution-logos";

/**
 * Step 1 of the direct-to-storage upload flow. institution_admin only.
 * Public bucket — a logo isn't sensitive, so the resulting public URL is
 * written straight to institutions.logo_url and read directly, no signed
 * URL round trip needed on every portal page load.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : null;
  const fileName = typeof body?.fileName === "string" ? body.fileName : null;
  if (!institutionId || !fileName) return json({ error: "bad_request" }, 400);

  const admin = createAdminClient();
  const { data: adminMembership } = await admin
    .from("institution_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .in("role", ADMIN_ROLES as string[])
    .maybeSingle();
  if (!adminMembership) return json({ error: "forbidden" }, 403);

  const storagePath = `${institutionId}/${crypto.randomUUID()}-${fileName}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) return json({ error: "server_error" }, 500);

  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(data.path);
  const { error: updateErr } = await admin
    .from("institutions")
    .update({ logo_url: publicUrlData.publicUrl })
    .eq("id", institutionId);
  if (updateErr) return json({ error: "server_error" }, 500);

  return json({ path: data.path, token: data.token, logoUrl: publicUrlData.publicUrl });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
