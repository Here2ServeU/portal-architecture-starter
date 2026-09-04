import { getInstitutionPeople, getViewAsCandidates, type InstitutionPerson } from "@/lib/portal/access";
import PortalShell, { type PortalNavItem } from "./PortalShell";
import PortalStyles from "./PortalStyles";
import StatCard from "./StatCard";
import ViewAsPicker from "./ViewAsPicker";
import LogoUpload from "./LogoUpload";
import TuitionPayments from "./TuitionPayments";

/**
 * Institution Admin dashboard: stat overview, grouped Teachers/Students/
 * Guardians roster, per-student tuition tracking, "view as" preview picker.
 * Logo upload lives in the sidebar (PortalShell's logoUpload slot), not a
 * main-content card — the admin manages branding from the same place every
 * other role sees it.
 */
export default async function AdminDashboard({
  institutionId,
  institutionName,
  institutionLogoUrl,
}: {
  institutionId: string;
  institutionName: string;
  institutionLogoUrl: string | null;
}) {
  const [people, viewAsCandidates] = await Promise.all([
    getInstitutionPeople(institutionId),
    getViewAsCandidates(institutionId),
  ]);

  const navItems: PortalNavItem[] = [
    { id: "top", label: "Home", href: "#ps-top" },
    { id: "teachers", label: "Teachers", href: "#ps-teachers" },
    { id: "students", label: "Students", href: "#ps-students" },
    { id: "guardians", label: "Guardians", href: "#ps-guardians" },
    { id: "payments", label: "Payments", href: "#ps-payments" },
    { id: "view-as", label: "View as", href: "#ps-view-as" },
  ];

  return (
    <PortalShell
      institution={{ name: institutionName, logoUrl: institutionLogoUrl }}
      navItems={navItems}
      activeId="top"
      logoUpload={<LogoUpload institutionId={institutionId} currentLogoUrl={institutionLogoUrl} compact />}
    >
      <div className="ps-header" id="ps-top">
        <div>
          <div className="ps-eyebrow">Role overview</div>
          <h1 className="ps-title">Administrator</h1>
          <p className="ps-lede">
            {institutionName}&apos;s full roster, tuition status, and the ability to preview any teacher, student, or
            guardian&apos;s real dashboard.
          </p>
        </div>
      </div>

      <div className="ps-stats">
        <StatCard label="Teachers" value={people.teachers.length} />
        <StatCard label="Students" value={people.students.length} />
        <StatCard label="Guardians" value={people.guardians.length} />
        <div className="ps-stat ps-stat-dark">
          <div className="ps-stat-label">Tuition</div>
          <div className="ps-stat-note">See Payments for this month&apos;s status</div>
        </div>
      </div>

      <div className="ps-card" id="ps-payments">
        <div className="ps-card-title">Monthly tuition payments</div>
        <TuitionPayments institutionId={institutionId} />
      </div>

      <PeopleSection id="ps-teachers" title="Teachers" people={people.teachers} />
      <PeopleSection id="ps-students" title="Students" people={people.students} />
      <PeopleSection id="ps-guardians" title="Guardians" people={people.guardians} />

      <div className="ps-card" id="ps-view-as">
        <div className="ps-card-title">View as</div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Preview the real Teacher, Student, or Guardian dashboard for anyone at this institution — actions taken
          while previewing are recorded as theirs.
        </p>
        <ViewAsPicker institutionId={institutionId} candidates={viewAsCandidates} />
      </div>

      <PortalStyles />
    </PortalShell>
  );
}

function PeopleSection({ id, title, people }: { id: string; title: string; people: InstitutionPerson[] }) {
  return (
    <div className="ps-card" id={id}>
      <div className="ps-card-title">{title}</div>
      {people.length === 0 ? (
        <p className="muted">No one yet.</p>
      ) : (
        <div className="ps-roster-table">
          {people.map((p) => (
            <div key={p.id} className="ps-roster-row">
              <div className="ps-roster-name">{p.fullName}</div>
              <div className="ps-status">{p.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
