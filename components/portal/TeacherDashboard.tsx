import { getStudentsForTeacher, type Teacher } from "@/lib/portal/access";
import PortalShell, { type PortalNavItem, type ViewAsBannerInfo } from "./PortalShell";
import PortalStyles from "./PortalStyles";
import StatCard, { initials } from "./StatCard";

/**
 * Teacher dashboard: stat cards, and the roster of every active student at
 * this institution whose grade matches one the teacher teaches. Kept simple
 * on purpose — a real app would layer materials/messaging/assignments on
 * top of this same roster query, but those aren't part of the schema this
 * starter ships (see supabase/schema.sql and the README's "what's omitted"
 * note).
 */
export default async function TeacherDashboard({
  institutionName,
  institutionLogoUrl,
  teacher,
  viewAsBanner,
}: {
  institutionName: string;
  institutionLogoUrl: string | null;
  teacher: Teacher;
  viewAsBanner?: ViewAsBannerInfo | null;
}) {
  const roster = await getStudentsForTeacher(teacher);

  const navItems: PortalNavItem[] = [
    { id: "top", label: "Home", href: "#ps-top" },
    { id: "roster", label: "Roster", href: "#ps-roster" },
  ];

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
          <h1 className="ps-title">Teacher</h1>
          <p className="ps-lede">
            {teacher.full_name}&apos;s classes at {institutionName}.
          </p>
        </div>
      </div>

      <div className="ps-stats">
        <StatCard label="Students" value={roster.length} />
        <StatCard label="Grades taught" value={teacher.grades_taught.join(", ") || "—"} />
        <StatCard label="Subjects" value={teacher.subjects.length} />
        <div className="ps-stat ps-stat-dark">
          <div className="ps-stat-label">Status</div>
          <div className="ps-stat-note">{teacher.status === "active" ? "Active" : teacher.status}</div>
        </div>
      </div>

      <div className="ps-card" id="ps-roster">
        <div className="ps-card-title">Roster</div>
        {roster.length === 0 ? (
          <p className="muted">No students in your grades yet.</p>
        ) : (
          <div className="ps-roster-table">
            <div className="ps-roster-row ps-roster-head" style={{ gridTemplateColumns: "2fr 1fr" }}>
              <div>Student</div>
              <div>Grade</div>
            </div>
            {roster.map((s) => (
              <div key={s.id} className="ps-roster-row" style={{ gridTemplateColumns: "2fr 1fr" }}>
                <div className="ps-roster-name">
                  <span className="ps-avatar ps-avatar-sm">{initials(s.full_name)}</span>
                  {s.full_name}
                </div>
                <div className="ps-status">Grade {s.grade}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PortalStyles />
    </PortalShell>
  );
}
