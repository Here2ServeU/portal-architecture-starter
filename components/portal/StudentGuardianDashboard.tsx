"use client";

import { useState } from "react";
import PortalShell, { type PortalNavItem, type ViewAsBannerInfo } from "./PortalShell";
import PortalStyles from "./PortalStyles";
import { initials } from "./StatCard";

export type StudentDTO = { id: string; fullName: string; grade: number; subjects: string[] };

export type StudentGuardianRole =
  | { kind: "student"; student: StudentDTO }
  | { kind: "guardian"; students: StudentDTO[] };

/**
 * Student and Guardian share one dashboard: a guardian just sees a "which
 * child" switcher up top that a lone student doesn't need (single child,
 * always selected). This mirrors the source app's ChildrenHeader pattern —
 * a guardian's dashboard is fundamentally "the student view, once per
 * child", not a separate UI.
 */
export default function StudentGuardianDashboard({
  institutionName,
  institutionLogoUrl,
  role,
  viewAsBanner,
}: {
  institutionName: string;
  institutionLogoUrl: string | null;
  role: StudentGuardianRole;
  viewAsBanner?: ViewAsBannerInfo | null;
}) {
  const students = role.kind === "guardian" ? role.students : [role.student];
  const [activeId, setActiveId] = useState(students[0]?.id ?? "");
  const active = students.find((s) => s.id === activeId) ?? students[0];

  const navItems: PortalNavItem[] = [{ id: "top", label: "Home", href: "#ps-top" }];

  return (
    <PortalShell
      institution={{ name: institutionName, logoUrl: institutionLogoUrl }}
      navItems={navItems}
      activeId="top"
      viewAsBanner={viewAsBanner}
    >
      <div className="ps-header" id="ps-top">
        <div>
          <div className="ps-eyebrow">Role overview</div>
          <h1 className="ps-title">{role.kind === "guardian" ? "Guardian" : "Student"}</h1>
          <p className="ps-lede">
            {role.kind === "guardian"
              ? `Your children's profiles at ${institutionName}.`
              : `Your profile at ${institutionName}.`}
          </p>
        </div>
        {students.length > 0 && (
          <div className="ps-header-children">
            {students.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`ps-header-child ${s.id === active?.id ? "active" : ""}`}
                onClick={() => setActiveId(s.id)}
                disabled={students.length === 1}
              >
                <span className="ps-avatar ps-avatar-sm">{initials(s.fullName)}</span>
                <span>
                  <div className="ps-child-name">{s.fullName}</div>
                  <div className="ps-child-grade">Grade {s.grade}</div>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="ps-card">
          <div className="ps-card-title">{active.fullName}</div>
          <p className="muted" style={{ marginBottom: 12 }}>
            Grade {active.grade}
          </p>
          {active.subjects.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {active.subjects.map((subj) => (
                <div
                  key={subj}
                  style={{
                    border: "1px solid var(--ps-border)",
                    borderRadius: 999,
                    padding: "8px 16px",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                  }}
                >
                  {subj}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <PortalStyles />
    </PortalShell>
  );
}
