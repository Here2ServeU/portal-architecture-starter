import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  getInstitutionBySlug,
  getTeacher,
  getStudent,
  getGuardianStudents,
  isInstitutionAdminOf,
} from "@/lib/portal/access";
import { getEffectivePortalUser } from "@/lib/portal/effective-user";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminDashboard from "@/components/portal/AdminDashboard";
import TeacherDashboard from "@/components/portal/TeacherDashboard";
import StudentGuardianDashboard, {
  type StudentGuardianRole,
} from "@/components/portal/StudentGuardianDashboard";
import type { ViewAsBannerInfo } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

/**
 * The portal entry page: resolves "who is logged in, what role do they
 * have here, what should they see" and renders the matching dashboard.
 *
 * Role resolution order mirrors the source pattern this starter is based
 * on: check institution_admin first (against the REAL user — never the
 * effective one, so previewing as a teacher can never loop back into the
 * admin branch), then fall through to teacher / student / guardian, each
 * resolved against the EFFECTIVE user id so a "view as" preview renders the
 * previewed person's own dashboard.
 */
export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(slug);
  if (!institution || institution.status !== "active") notFound();

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/portal/${slug}`);

  const { effectiveUserId, viewAs } = await getEffectivePortalUser(user.id);

  const isAdmin = viewAs ? false : await isInstitutionAdminOf(user.id, institution.id);
  if (isAdmin) {
    return (
      <AdminDashboard
        institutionId={institution.id}
        institutionName={institution.name}
        institutionLogoUrl={institution.logo_url}
      />
    );
  }

  const teacher = await getTeacher(effectiveUserId);
  if (teacher && teacher.status === "active" && teacher.institution_id === institution.id) {
    const viewAsBanner = await buildBanner(viewAs, teacher.full_name);
    return (
      <TeacherDashboard
        institutionName={institution.name}
        institutionLogoUrl={institution.logo_url}
        teacher={teacher}
        viewAsBanner={viewAsBanner}
      />
    );
  }

  const student = await getStudent(effectiveUserId);
  if (student && student.status === "active" && student.institution_id === institution.id) {
    const role: StudentGuardianRole = {
      kind: "student",
      student: { id: student.id, fullName: student.full_name, grade: student.grade, subjects: student.subjects },
    };
    const viewAsBanner = await buildBanner(viewAs, student.full_name);
    return (
      <StudentGuardianDashboard
        institutionName={institution.name}
        institutionLogoUrl={institution.logo_url}
        role={role}
        viewAsBanner={viewAsBanner}
      />
    );
  }

  const guardianStudents = (await getGuardianStudents(effectiveUserId)).filter(
    (s) => s.institution_id === institution.id,
  );
  if (guardianStudents.length > 0) {
    const role: StudentGuardianRole = {
      kind: "guardian",
      students: guardianStudents.map((s) => ({ id: s.id, fullName: s.full_name, grade: s.grade, subjects: s.subjects })),
    };
    const viewAsBanner = await buildBanner(viewAs, await getDisplayName(effectiveUserId));
    return (
      <StudentGuardianDashboard
        institutionName={institution.name}
        institutionLogoUrl={institution.logo_url}
        role={role}
        viewAsBanner={viewAsBanner}
      />
    );
  }

  return (
    <section style={{ padding: "60px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>No access yet</h1>
      <p style={{ color: "#6b7080" }}>
        Your account isn&apos;t linked to a role at {institution.name}. Ask an administrator to add you.
      </p>
    </section>
  );
}

async function buildBanner(
  viewAs: Awaited<ReturnType<typeof getEffectivePortalUser>>["viewAs"],
  targetName: string,
): Promise<ViewAsBannerInfo | null> {
  if (!viewAs) return null;
  return { targetRole: viewAs.targetRole, targetName };
}

async function getDisplayName(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name ?? data?.email ?? "this person";
}
