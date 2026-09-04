import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "./config";

export type Institution = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
};

export type Teacher = {
  id: string;
  institution_id: string;
  user_id: string;
  full_name: string;
  grades_taught: number[];
  subjects: string[];
  status: string;
};

export type Student = {
  id: string;
  institution_id: string;
  user_id: string | null;
  full_name: string;
  grade: number;
  subjects: string[];
  status: string;
};

/** The institution for a portal slug, or null if none matches / it's not active. */
export async function getInstitutionBySlug(slug: string): Promise<Institution | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("institutions")
    .select("id, name, slug, logo_url, status")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Institution | null) ?? null;
}

/** The teachers row for a user, or null if they're not a teacher. */
export async function getTeacher(userId: string): Promise<Teacher | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("teachers")
    .select("id, institution_id, user_id, full_name, grades_taught, subjects, status")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Teacher | null) ?? null;
}

/** The students row for a user's own student account, or null. */
export async function getStudent(userId: string): Promise<Student | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id, institution_id, user_id, full_name, grade, subjects, status")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Student | null) ?? null;
}

/** Every student a guardian is linked to, via student_guardians. */
export async function getGuardianStudents(userId: string): Promise<Student[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("student_guardians")
    .select("students(id, institution_id, user_id, full_name, grade, subjects, status)")
    .eq("guardian_user_id", userId);
  return (data ?? []).flatMap((row) => (row.students ? [row.students as unknown as Student] : []));
}

/** Is userId an admin (institution_admin) at institutionId, checked against institution_memberships? */
export async function isInstitutionAdminOf(userId: string, institutionId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("institution_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", institutionId)
    .in("role", ADMIN_ROLES as string[])
    .maybeSingle();
  return !!data;
}

export interface ViewAsCandidate {
  userId: string;
  fullName: string;
  role: "teacher" | "student" | "guardian";
  detail: string;
}

/**
 * Real people at institutionId whose dashboard an institution_admin can
 * preview via "view as" — drawn from the same teachers/students/
 * student_guardians tables the role-resolution page actually reads, so
 * every candidate returned here is guaranteed to render a real dashboard
 * when previewed (see lib/portal/effective-user.ts).
 */
export async function getViewAsCandidates(institutionId: string): Promise<ViewAsCandidate[]> {
  const admin = createAdminClient();
  const [{ data: teachers }, { data: students }] = await Promise.all([
    admin
      .from("teachers")
      .select("user_id, full_name, grades_taught")
      .eq("institution_id", institutionId)
      .eq("status", "active"),
    admin
      .from("students")
      .select("id, user_id, full_name, grade")
      .eq("institution_id", institutionId)
      .eq("status", "active"),
  ]);

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: guardianLinks } = studentIds.length
    ? await admin.from("student_guardians").select("guardian_user_id, students(full_name)").in("student_id", studentIds)
    : { data: [] as { guardian_user_id: string; students: { full_name: string } | null }[] };

  const guardianChildren = new Map<string, string[]>();
  for (const link of guardianLinks ?? []) {
    const childName = (link.students as unknown as { full_name: string } | null)?.full_name;
    if (!childName) continue;
    guardianChildren.set(link.guardian_user_id, [...(guardianChildren.get(link.guardian_user_id) ?? []), childName]);
  }

  const guardianIds = [...guardianChildren.keys()];
  const { data: guardianProfiles } = guardianIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", guardianIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const guardianProfileById = new Map((guardianProfiles ?? []).map((p) => [p.id, p]));

  const candidates: ViewAsCandidate[] = [];
  for (const t of teachers ?? []) {
    if (!t.user_id) continue;
    candidates.push({
      userId: t.user_id,
      fullName: t.full_name,
      role: "teacher",
      detail: `Grades ${t.grades_taught.join(", ") || "—"}`,
    });
  }
  for (const s of students ?? []) {
    if (!s.user_id) continue;
    candidates.push({ userId: s.user_id, fullName: s.full_name, role: "student", detail: `Grade ${s.grade}` });
  }
  for (const [guardianUserId, childNames] of guardianChildren) {
    const profile = guardianProfileById.get(guardianUserId);
    candidates.push({
      userId: guardianUserId,
      fullName: profile?.full_name ?? profile?.email ?? "Guardian",
      role: "guardian",
      detail: `Guardian of ${childNames.join(", ")}`,
    });
  }

  return candidates;
}

/** Students at a teacher's institution whose grade is one the teacher teaches — the teacher's roster. */
export async function getStudentsForTeacher(teacher: Teacher): Promise<Student[]> {
  if (teacher.grades_taught.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id, institution_id, user_id, full_name, grade, subjects, status")
    .eq("institution_id", teacher.institution_id)
    .eq("status", "active")
    .in("grade", teacher.grades_taught)
    .order("full_name", { ascending: true });
  return (data ?? []) as Student[];
}

export interface InstitutionPerson {
  id: string;
  fullName: string;
  detail: string;
}

export interface InstitutionPeople {
  teachers: InstitutionPerson[];
  students: InstitutionPerson[];
  guardians: InstitutionPerson[];
}

/**
 * Grouped Teachers/Students/Guardians for the admin dashboard's roster
 * sections. Unlike getViewAsCandidates, students without a login yet
 * (user_id null) are still included — an admin needs to see and bill a
 * student who's enrolled but hasn't logged in, even though that student
 * can't be "viewed as".
 */
export async function getInstitutionPeople(institutionId: string): Promise<InstitutionPeople> {
  const admin = createAdminClient();
  const [{ data: teachers }, { data: students }] = await Promise.all([
    admin
      .from("teachers")
      .select("id, full_name, grades_taught")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .order("full_name", { ascending: true }),
    admin
      .from("students")
      .select("id, full_name, grade")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .order("full_name", { ascending: true }),
  ]);

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: guardianLinks } = studentIds.length
    ? await admin.from("student_guardians").select("guardian_user_id, students(full_name)").in("student_id", studentIds)
    : { data: [] as { guardian_user_id: string; students: { full_name: string } | null }[] };

  const guardianChildren = new Map<string, string[]>();
  for (const link of guardianLinks ?? []) {
    const childName = (link.students as unknown as { full_name: string } | null)?.full_name;
    if (!childName) continue;
    guardianChildren.set(link.guardian_user_id, [...(guardianChildren.get(link.guardian_user_id) ?? []), childName]);
  }

  const guardianIds = [...guardianChildren.keys()];
  const { data: guardianProfiles } = guardianIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", guardianIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const guardianProfileById = new Map((guardianProfiles ?? []).map((p) => [p.id, p]));

  return {
    teachers: (teachers ?? []).map((t) => ({
      id: t.id,
      fullName: t.full_name,
      detail: `Grades ${t.grades_taught.join(", ") || "—"}`,
    })),
    students: (students ?? []).map((s) => ({ id: s.id, fullName: s.full_name, detail: `Grade ${s.grade}` })),
    guardians: guardianIds.map((guardianUserId) => {
      const profile = guardianProfileById.get(guardianUserId);
      const childNames = guardianChildren.get(guardianUserId) ?? [];
      return {
        id: guardianUserId,
        fullName: profile?.full_name ?? profile?.email ?? "Guardian",
        detail: `Guardian of ${childNames.join(", ")}`,
      };
    }),
  };
}
