# Portal Architecture Starter

A minimal, working Next.js 15 (App Router) + TypeScript + Supabase project
that demonstrates one architecture pattern for multi-tenant "institution
portal" apps — a school, in this example, but the same shape generalizes to
any setting where one organization has an admin, a set of staff, and a set
of people staff are responsible for (clinics, gyms, tutoring centers,
co-ops...).

This is a teaching artifact, not a product. It's deliberately small: four
roles, one schema file, no styling framework, no test suite. The goal is
that you can read every file in `lib/portal/` and `components/portal/` in
one sitting and come away understanding the pattern well enough to build
your own version of it.

## The pattern

### Roles behind one shared shell

Every role — admin, teacher, student, guardian — signs into the same URL
(`/portal/[slug]`) and gets a different dashboard, but all four dashboards
render inside the same `PortalShell` component (institution branding +
sidebar nav + sign-out). The entry page
(`app/portal/[slug]/page.tsx`) does the role resolution: it checks whether
the signed-in user is an institution admin first, then falls through to
teacher, then student, then guardian, rendering the matching dashboard
component. One page, one shell, four possible bodies — not four separate
apps that happen to share a login screen.

### "View as": a real person's dashboard, not a simulation

An institution admin can pick any teacher, student, or guardian at their
institution and preview their exact dashboard — not a mocked-up read-only
view, but the real one, fully interactive. Actions taken while previewing
are attributed to the person being previewed, not the admin.

This works through `lib/portal/effective-user.ts`. Starting a preview
writes a row to `portal_view_as_sessions` and sets an **httpOnly cookie
holding only that row's opaque id** — never a signed claim like "this
browser is now teacher X". Every subsequent request re-derives the
"effective user" by:

1. Looking up the session row by the cookie's id.
2. Confirming it hasn't expired or been explicitly ended.
3. Re-checking, **fresh, on every single request**, that the real signed-in
   user is *still* an institution admin at that institution.

Step 3 is the part worth noticing. The check is never cached and never
trusted from the session row itself — it goes back to
`institution_memberships` every time. If an admin is demoted mid-preview,
the very next request they make silently drops back to their own identity,
with no separate revocation step required. A tampered cookie value just
fails the row lookup in step 1; it can never grant access to anything on
its own, because it carries no identity claim, only a reference to a row
the server controls.

Every portal page and API route calls `getEffectivePortalUser()` right
after resolving the real signed-in user, and uses the resulting
`effectiveUserId` everywhere an ordinary user id would go — both for "whose
dashboard is this" and for "is this write allowed". That's what makes the
preview fully interactive rather than read-only.

### Two-step direct-to-storage uploads

File uploads (the institution logo, in this starter) never pass through
the Next.js server. The client asks a Route Handler for a signed upload URL
(`app/api/portal/logo-upload/route.ts`), which checks the caller is an
institution admin and returns a short-lived signed URL scoped to one
storage path. The browser then uploads the file's bytes **directly to
Supabase Storage** using that URL (`components/portal/LogoUpload.tsx`). The
app server only ever sees metadata (a file name), never the file itself —
the same shape scales to much larger files (video, PDFs) without the
server needing to buffer or stream them.

### Server-side authorization, not just RLS

Most reads and writes in this starter go through a **service-role**
Supabase client (`lib/supabase/admin.ts`), which bypasses Row Level
Security entirely, and then re-implement the authorization check directly
in TypeScript (see `lib/portal/access.ts` and every `app/api/portal/*`
route). This mirrors a real constraint: rules like "an institution admin
can act as any teacher at their institution, but only while a preview
session is valid" aren't expressible as a static RLS policy. RLS is still
enabled on every table (`supabase/schema.sql`, section 9) as defense in
depth for direct client (anon-key) access, but this app doesn't lean on it
for the portal's own logic.

## What's in the schema

`supabase/schema.sql` is one consolidated, idempotent file:

- **`institutions`** — one row per tenant (name, slug, logo, status).
- **`institution_memberships`** — the roster: one row per
  (user, institution, role, section). This is the "layer A" table —
  lightweight, used for "who belongs where, in what role."
- **`class_sections`** — a teacher's/student's section within an
  institution.
- **`teachers`** / **`students`** — "layer B" role-detail tables, holding
  fields a plain membership row has no home for (grades taught, subjects,
  grade level). `students.user_id` is nullable on purpose: a student can be
  enrolled and billable before they ever have a login.
- **`student_guardians`** — links a guardian's auth user straight to the
  student rows they can see. Deliberately *not* routed through
  `institution_memberships`, since one guardian's children can be enrolled
  at different institutions.
- **`institution_tuition_payments`** — per-student, per-month paid/unpaid
  tracking for the admin dashboard.
- **`portal_view_as_sessions`** — backs the "view as" pattern above.
- **`profiles`** — a public mirror of `auth.users(id, email)` plus an
  editable `full_name`, kept in sync by a trigger. Standard Supabase
  scaffolding, not specific to this pattern.

**A judgment call worth flagging**: a production version of this pattern
sometimes needs the membership/roster layer and the role-detail layer to
diverge more than they do here (e.g. a roster import step that runs ahead
of role-detail rows being created). This starter keeps the two-layer split
because it's genuinely instructive, but doesn't try to replicate every
historical wrinkle of a system that grew both layers organically over time
— treat the two-table shape as "the concept," not as gospel for your own
schema.

## What's deliberately left out

This starter is scoped to the portal/roster/"view as" architecture only.
Specifically **not included**, because they're separate concerns bolted
onto a real production app rather than part of this pattern:

- Any AI chat / tutoring feature.
- Course-content catalogs, curriculum assignment, or file libraries.
- Billing/subscription or spend-tracking for the *platform itself* (the
  `institution_tuition_payments` table here tracks a school's own tuition
  from families — a different thing).
- Content moderation.
- Minor-lock/consent workflows beyond the `is_minor` column's mere
  existence — a real implementation would need a consent-recording flow,
  which is product-specific enough that it's left as an exercise.
- Messaging/threads between roles.

## Getting started

1. **Create your own free Supabase project** at
   [supabase.com](https://supabase.com) — this starter isn't wired to any
   shared or pre-existing project.
2. Open your project's SQL Editor and paste in the contents of
   [`supabase/schema.sql`](./supabase/schema.sql). Run it once.
3. (Optional but recommended) Paste in [`seed.sql`](./seed.sql) and run it
   too — it creates one demo institution (`riverside-academy`) with a fake
   admin, teacher, three students, and a guardian, so the app shows
   something real immediately. All fictional names; the seeded accounts all
   share the password `demo-password-123`, and you're expected to delete or
   change them before using this project for anything real.
4. Copy `.env.example` to `.env.local` and fill in your project's own URL
   and keys (Project Settings → API in the Supabase dashboard).
5. Install and run:
   ```
   npm install
   npm run dev
   ```
6. Visit `http://localhost:3000`, sign in via magic link (any email your
   Supabase project can send to — check its Auth settings if emails aren't
   arriving), then visit `/portal/riverside-academy`. If you signed in with
   one of the seeded emails from step 3, you'll land on that role's real
   dashboard; any other email lands on the "no access yet" state, which is
   the expected behavior for an unrostered account.

## Contributing

Fork this repo, make your change on a branch, and open a pull request. This
is meant to be poked at and improved — extend a dashboard, add a role,
tighten an authorization check, whatever. Small, focused PRs are easiest to
review.
