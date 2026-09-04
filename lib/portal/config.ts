// Generalized institution role model. A larger production system might also
// have admin/learner role variants for a separate B2B product line, or
// additional institution "kinds" (e.g. university vs. school) — both
// omitted here as out-of-scope business context, not part of the reusable
// pattern. Add your own kinds/roles the same way: widen the check
// constraint in supabase/schema.sql and this union type together.

export type InstitutionRole = "institution_admin" | "teacher" | "student" | "guardian";

export const INSTITUTION_ROLES: readonly InstitutionRole[] = [
  "institution_admin",
  "teacher",
  "student",
  "guardian",
] as const;

export function isInstitutionRole(v: string | null | undefined): v is InstitutionRole {
  return !!v && (INSTITUTION_ROLES as readonly string[]).includes(v);
}

// The one role that can act as an institution-wide administrator (roster,
// branding, tuition). Kept as an array (rather than a single constant) so
// call sites that check membership with `.in("role", ADMIN_ROLES)` don't
// need to change shape if you ever add a second admin-ish role later.
export const ADMIN_ROLES: readonly InstitutionRole[] = ["institution_admin"];

export type InstitutionStatus = "pending" | "active" | "paused";
