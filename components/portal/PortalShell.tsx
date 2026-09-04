"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PortalNavItem = { id: string; label: string; href: string };

export type ViewAsBannerInfo = {
  targetName: string;
  targetRole: "teacher" | "student" | "guardian";
};

const ROLE_LABEL: Record<ViewAsBannerInfo["targetRole"], string> = {
  teacher: "Teacher",
  student: "Student",
  guardian: "Guardian",
};

/**
 * Shared shell for every portal role (admin/teacher/student/guardian): a
 * dark sidebar with institution branding + nav, and a content column. Every
 * role's page renders the SAME shell with a different set of nav items and
 * a different main-content component — see app/portal/[slug]/page.tsx.
 */
export default function PortalShell({
  institution,
  navItems,
  activeId,
  viewAsBanner,
  logoUpload,
  children,
}: {
  institution: { name: string; logoUrl: string | null };
  navItems: PortalNavItem[];
  activeId?: string;
  viewAsBanner?: ViewAsBannerInfo | null;
  /** Admin-only: a compact upload control rendered under the brand block — see LogoUpload.tsx. */
  logoUpload?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ps-shell">
      <aside className="ps-sidebar">
        <div className="ps-brand">
          {institution.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institution.logoUrl} alt={institution.name} className="ps-brand-logo" />
          ) : (
            <div className="ps-brand-fallback">{institution.name.slice(0, 1).toUpperCase()}</div>
          )}
          <span>{institution.name}</span>
        </div>
        {logoUpload && <div className="ps-brand-upload">{logoUpload}</div>}
        <nav className="ps-nav">
          {navItems.map((item) => (
            <a key={item.id} href={item.href} className={`ps-nav-item${item.id === activeId ? " active" : ""}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <SignOutFoot />
      </aside>
      <div className="ps-main">
        {viewAsBanner && <ViewAsBanner banner={viewAsBanner} />}
        {children}
      </div>
    </div>
  );
}

function SignOutFoot() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="ps-sidebar-foot">
      <button type="button" className="ps-signout" onClick={signOut} disabled={signingOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

function ViewAsBanner({ banner }: { banner: ViewAsBannerInfo }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function exit() {
    if (exiting) return;
    setExiting(true);
    await fetch("/api/portal/view-as", { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="ps-view-as-banner">
      <span>
        Viewing as <strong>{banner.targetName}</strong> ({ROLE_LABEL[banner.targetRole]}) — actions taken here are
        recorded as theirs.
      </span>
      <button type="button" className="link" onClick={exit} disabled={exiting}>
        {exiting ? "Exiting…" : "Exit preview"}
      </button>
    </div>
  );
}
