-- Portal Architecture Starter — optional demo data.
--
-- Run AFTER supabase/schema.sql, in the same SQL editor. Creates one demo
-- institution with a fake admin, teacher, three students, and a guardian —
-- entirely fictional names, no real people — so `npm run dev` shows
-- something immediately.
--
-- This inserts directly into auth.users, which only works from the
-- Supabase SQL editor (or any connection using the postgres/service role) —
-- never do this from application code. Every seeded account shares the
-- password below; sign in at /login with magic link instead, or use these
-- credentials with supabase.auth.signInWithPassword() if you'd rather test
-- password auth. Change or delete these rows before inviting anyone else to
-- your project.
--
-- Idempotent: safe to re-run (all inserts are ON CONFLICT DO NOTHING).

create extension if not exists pgcrypto;

-- 1. DEMO USERS ----------------------------------------------------------
-- Fixed, made-up UUIDs so the rest of this script can reference them
-- directly rather than doing a lookup round-trip.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@example.com', crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Amara Okafor"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'teacher@example.com', crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Daniel Kim"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'student1@example.com', crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'student2@example.com', crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Reyes"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'guardian@example.com', crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Lucia Fernandez"}', false, false)
on conflict (id) do nothing;

-- 2. DEMO INSTITUTION ------------------------------------------------------
insert into public.institutions (id, name, slug, status)
values ('20000000-0000-0000-0000-000000000001', 'Riverside Academy', 'riverside-academy', 'active')
on conflict (id) do nothing;

-- 3. CLASS SECTION -----------------------------------------------------------
insert into public.class_sections (id, institution_id, name, grade_level)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Grade 6 — Section A', '6')
on conflict (id) do nothing;

-- 4. INSTITUTION MEMBERSHIPS (roster) -----------------------------------------
insert into public.institution_memberships (user_id, institution_id, role, class_section_id, is_minor)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'institution_admin', null, false),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'teacher', '30000000-0000-0000-0000-000000000001', false),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'student', '30000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'student', '30000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'guardian', null, false)
on conflict (user_id, institution_id, role, class_section_id) do nothing;

-- 5. ROLE-DETAIL ROWS ----------------------------------------------------------
insert into public.teachers (id, institution_id, user_id, full_name, grades_taught, subjects, status)
values (
  '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002', 'Daniel Kim', array[6], array['Mathematics', 'Science'], 'active'
)
on conflict (id) do nothing;

insert into public.students (id, institution_id, user_id, full_name, grade, subjects, status)
values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003', 'Priya Nair', 6, array['Mathematics', 'Science', 'Art'], 'active'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004', 'Marcus Reyes', 6, array['Mathematics', 'Science'], 'active'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   null, 'Chidi Obi', 6, array['Mathematics'], 'active')
on conflict (id) do nothing;

-- 6. GUARDIAN LINK ---------------------------------------------------------
insert into public.student_guardians (guardian_user_id, student_id)
values ('10000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001')
on conflict (guardian_user_id, student_id) do nothing;
