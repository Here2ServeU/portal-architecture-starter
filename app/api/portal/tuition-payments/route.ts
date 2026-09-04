import { getSessionUser } from "@/lib/auth/session";
import { getEffectivePortalUser } from "@/lib/portal/effective-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/portal/config";

export const runtime = "nodejs";

/**
 * Per-student monthly tuition status — institution_admin only. GET returns
 * every active student at the institution for the given period, defaulting
 * missing rows to "unpaid" (a student with no row yet has never been
 * marked, which is the correct unpaid default, not an error). POST upserts
 * one student's status for one period.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const institutionId = url.searchParams.get("institutionId");
  const period = url.searchParams.get("period");
  if (!institutionId || !period || !/^\d{4}-\d{2}$/.test(period)) return json({ error: "bad_request" }, 400);

  const admin = createAdminClient();
  if (!(await isAdminOf(admin, user.id, institutionId))) return json({ error: "forbidden" }, 403);

  const [{ data: students }, { data: payments }] = await Promise.all([
    admin
      .from("students")
      .select("id, full_name, grade")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .order("full_name", { ascending: true }),
    admin
      .from("institution_tuition_payments")
      .select("student_id, status, amount, paid_at")
      .eq("institution_id", institutionId)
      .eq("period", period),
  ]);

  const byStudent = new Map((payments ?? []).map((p) => [p.student_id, p]));
  const rows = (students ?? []).map((s) => {
    const payment = byStudent.get(s.id);
    return {
      studentId: s.id,
      fullName: s.full_name,
      grade: s.grade,
      status: (payment?.status as "paid" | "unpaid" | undefined) ?? "unpaid",
      amount: payment?.amount ?? null,
      paidAt: payment?.paid_at ?? null,
    };
  });

  return json({ rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { effectiveUserId } = await getEffectivePortalUser(user.id);

  const body = await req.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : null;
  const studentId = typeof body?.studentId === "string" ? body.studentId : null;
  const period = typeof body?.period === "string" ? body.period : null;
  const status = body?.status === "paid" || body?.status === "unpaid" ? body.status : null;
  const amount = typeof body?.amount === "number" ? body.amount : null;
  if (!institutionId || !studentId || !period || !status || !/^\d{4}-\d{2}$/.test(period)) {
    return json({ error: "bad_request" }, 400);
  }

  const admin = createAdminClient();
  // Admin status is checked against the REAL signed-in user, not the
  // effective (possibly previewed) one — payments are an admin-only action,
  // never something a previewed teacher/student/guardian dashboard exposes.
  if (!(await isAdminOf(admin, user.id, institutionId))) return json({ error: "forbidden" }, 403);

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (!student) return json({ error: "not_found" }, 404);

  const { error } = await admin.from("institution_tuition_payments").upsert(
    {
      institution_id: institutionId,
      student_id: studentId,
      period,
      status,
      amount,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      marked_by: effectiveUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,period" },
  );
  if (error) return json({ error: "server_error" }, 500);

  return json({ ok: true });
}

async function isAdminOf(admin: ReturnType<typeof createAdminClient>, userId: string, institutionId: string): Promise<boolean> {
  const { data } = await admin
    .from("institution_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", institutionId)
    .in("role", ADMIN_ROLES as string[])
    .maybeSingle();
  return !!data;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
