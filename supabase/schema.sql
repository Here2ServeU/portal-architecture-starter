-- Portal Architecture Starter — consolidated schema.
--
-- Paste this whole file into your Supabase project's SQL editor (Dashboard
-- -> SQL Editor -> New query) and run it once. Idempotent: safe to re-run.
--
-- SCHEMA NOTE (documented per the README): production versions of this
-- pattern sometimes split "is this person rostered at all" from "what does
-- their role look like in detail" into two layers — a lightweight
-- membership/roster table, and separate per-role detail tables. This
-- starter keeps that same two-layer shape because it's genuinely useful to
-- see: `institution_memberships` is the roster (who belongs where, in what
-- role, in which section), while `teachers` / `students` carry the
-- role-specific fields (grades taught, subjects, grade level) that a plain
-- membership row has no natural place for. `student_guardians` links a
-- guardian's auth user directly to the `students` row(s) they can see —
-- deliberately NOT scoped through institution_memberships, since one
-- guardian's children can be enrolled at different institutions.
--
-- One simplification versus a larger production system: `institution_admin`
-- is the only admin-ish role (no separate "company admin" concept), and
-- `guardian` IS a valid `institution_memberships.role` here for simplicity,
-- even though a guardian's actual data access comes from
-- `student_guardians`, not from a class_section assignment.

-- 0. PROFILES ------------------------------------------------------------
-- Mirrors auth.users(id, email) into a public, joinable table with a
-- user-editable full_name. Supabase's auth.users table lives in a schema
-- your app can't directly join against from a client query, so nearly every
-- multi-tenant Supabase app ends up with a `profiles` table like this one,
-- kept in sync via a trigger on auth.users insert.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles are self-readable" on public.profiles;
create policy "profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles are self-updatable" on public.profiles;
create policy "profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

-- 1. INSTITUTIONS ----------------------------------------------------------
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  status text not null default 'active' check (status in ('pending', 'active', 'paused')),
  created_at timestamptz not null default now()
);

-- 2. CLASS SECTIONS ----------------------------------------------------------
create table if not exists public.class_sections (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  grade_level text,
  created_at timestamptz not null default now()
);
create index if not exists class_sections_institution_idx on public.class_sections (institution_id);

-- 3. INSTITUTION MEMBERSHIPS -------------------------------------------------
-- The roster: one row per (user, institution, role[, section]). A teacher
-- who teaches two sections gets two rows; a student enrolled in one section
-- gets one. `is_minor` gates content access at the app layer (see the
-- README's "what's omitted" note — this starter ships the column and the
-- schema shape, but the actual lock/consent flow is left as an exercise,
-- since it's product-specific, not part of the reusable portal pattern).
create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  role text not null check (role in ('institution_admin', 'teacher', 'student', 'guardian')),
  class_section_id uuid references public.class_sections(id) on delete set null,
  is_minor boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, institution_id, role, class_section_id)
);
create index if not exists institution_memberships_user_idx on public.institution_memberships (user_id);
create index if not exists institution_memberships_institution_idx on public.institution_memberships (institution_id);

-- 4. TEACHERS (role detail) --------------------------------------------------
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  grades_taught int[] not null default '{}',
  subjects text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);
create index if not exists teachers_institution_idx on public.teachers (institution_id);
create index if not exists teachers_user_idx on public.teachers (user_id);

-- 5. STUDENTS (role detail) --------------------------------------------------
-- user_id is nullable: a student can be enrolled (and billed — see
-- institution_tuition_payments) before they ever have a login.
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  grade int not null,
  subjects text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);
create index if not exists students_institution_idx on public.students (institution_id);
create index if not exists students_user_idx on public.students (user_id);

-- 6. STUDENT GUARDIANS --------------------------------------------------------
-- Links a guardian's auth user directly to the students they can see.
-- Independent of institution_memberships on purpose: a guardian isn't
-- "rostered" at an institution the way a teacher or student is, and their
-- children may be at different institutions entirely.
create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (guardian_user_id, student_id)
);
create index if not exists student_guardians_guardian_idx on public.student_guardians (guardian_user_id);
create index if not exists student_guardians_student_idx on public.student_guardians (student_id);

-- 7. TUITION PAYMENTS ---------------------------------------------------------
-- Per-student monthly tuition tracking for the admin dashboard. Keyed by
-- students.id (not a user_id), since a student can be billable before they
-- ever have a login. No client RLS: writes go through
-- app/api/portal/tuition-payments/route.ts, which re-checks
-- institution_admin membership itself.
create table if not exists public.institution_tuition_payments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  amount numeric,
  paid_at timestamptz,
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, period)
);
create index if not exists institution_tuition_payments_institution_period_idx
  on public.institution_tuition_payments (institution_id, period);

-- 8. "VIEW AS" SESSIONS --------------------------------------------------------
-- Lets an institution_admin preview a real teacher/student/guardian's
-- dashboard, fully interactively (writes are attributed to the person being
-- previewed, not the admin) — see lib/portal/effective-user.ts. No client
-- RLS: every read/write goes through service-role API routes that re-check
-- authorization themselves. The httpOnly cookie set by those routes holds
-- only this row's id, never the admin's or target's identity directly, so a
-- tampered cookie value just fails the row lookup rather than granting
-- anything.
create table if not exists public.portal_view_as_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null check (target_role in ('teacher', 'student', 'guardian')),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);
create index if not exists portal_view_as_sessions_admin_idx on public.portal_view_as_sessions (admin_user_id);

-- 9. ROW LEVEL SECURITY --------------------------------------------------------
-- Enabled as defense in depth, but this starter's Route Handlers and Server
-- Components all read/write through the SERVICE ROLE client
-- (lib/supabase/admin.ts) and re-implement authorization themselves in
-- TypeScript (see lib/portal/access.ts, lib/portal/effective-user.ts) —
-- exactly like a production app that can't express "an institution_admin
-- can act as any teacher at their institution" as a static RLS policy. The
-- policies below are what a signed-in user's own browser session (anon key)
-- can see directly, which this starter doesn't rely on for the portal UI
-- but is good hygiene regardless.
alter table public.institutions               enable row level security;
alter table public.class_sections              enable row level security;
alter table public.institution_memberships     enable row level security;
alter table public.teachers                    enable row level security;
alter table public.students                    enable row level security;
alter table public.student_guardians           enable row level security;
alter table public.institution_tuition_payments enable row level security;
alter table public.portal_view_as_sessions     enable row level security;

drop policy if exists "institutions are readable by anyone signed in" on public.institutions;
create policy "institutions are readable by anyone signed in" on public.institutions
  for select using (auth.role() = 'authenticated');

drop policy if exists "own membership or institution admin read" on public.institution_memberships;
create policy "own membership or institution admin read" on public.institution_memberships
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.institution_memberships admin_m
      where admin_m.institution_id = institution_memberships.institution_id
        and admin_m.user_id = auth.uid()
        and admin_m.role = 'institution_admin'
    )
  );

drop policy if exists "institution members read sections" on public.class_sections;
create policy "institution members read sections" on public.class_sections
  for select using (
    exists (
      select 1 from public.institution_memberships m
      where m.institution_id = class_sections.institution_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "own teacher row or institution admin read" on public.teachers;
create policy "own teacher row or institution admin read" on public.teachers
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.institution_memberships admin_m
      where admin_m.institution_id = teachers.institution_id
        and admin_m.user_id = auth.uid()
        and admin_m.role = 'institution_admin'
    )
  );

drop policy if exists "own student row or institution admin read" on public.students;
create policy "own student row or institution admin read" on public.students
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.institution_memberships admin_m
      where admin_m.institution_id = students.institution_id
        and admin_m.user_id = auth.uid()
        and admin_m.role = 'institution_admin'
    )
    or exists (
      select 1 from public.student_guardians sg
      where sg.student_id = students.id and sg.guardian_user_id = auth.uid()
    )
  );

drop policy if exists "guardian reads own links" on public.student_guardians;
create policy "guardian reads own links" on public.student_guardians
  for select using (guardian_user_id = auth.uid());

drop policy if exists "no direct client access to tuition payments" on public.institution_tuition_payments;
-- Intentionally no select/insert/update policy: this table is written and
-- read exclusively through the service-role API route. RLS stays enabled
-- with zero policies, which denies all direct client access by default.

drop policy if exists "no direct client access to view-as sessions" on public.portal_view_as_sessions;
-- Same as above: service-role only, zero client policies.

-- 10. STORAGE BUCKET FOR INSTITUTION LOGOS -------------------------------------
-- Public bucket — a logo isn't sensitive, so it's served directly by its
-- public URL rather than through a signed-URL round trip.
insert into storage.buckets (id, name, public)
values ('institution-logos', 'institution-logos', true)
on conflict (id) do nothing;
