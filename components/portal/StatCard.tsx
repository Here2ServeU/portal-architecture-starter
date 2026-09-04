export default function StatCard({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="ps-stat">
      <div className="ps-stat-label">{label}</div>
      <div className="ps-stat-value">{value ?? "—"}</div>
    </div>
  );
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
