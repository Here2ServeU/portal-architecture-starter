"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ViewAsCandidate } from "@/lib/portal/access";

const ROLE_LABEL: Record<ViewAsCandidate["role"], string> = {
  teacher: "Teacher",
  student: "Student",
  guardian: "Guardian",
};

/**
 * Lets an institution_admin start a "view as" preview of a real teacher/
 * student/guardian at this institution — see app/api/portal/view-as/route.ts
 * and lib/portal/effective-user.ts for how the resulting cookie makes every
 * subsequent page/API call act as that person.
 */
export default function ViewAsPicker({
  institutionId,
  candidates,
}: {
  institutionId: string;
  candidates: ViewAsCandidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(candidates[0] ? `${candidates[0].role}:${candidates[0].userId}` : "");
  const [starting, setStarting] = useState(false);

  if (candidates.length === 0) {
    return <p className="muted">No teachers, students, or guardians are linked to this institution yet.</p>;
  }

  async function start() {
    if (starting || !selected) return;
    const [role, userId] = selected.split(":");
    setStarting(true);
    try {
      const res = await fetch("/api/portal/view-as", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, targetRole: role, institutionId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setStarting(false);
    }
  }

  const grouped = (["teacher", "student", "guardian"] as const).map((role) => ({
    role,
    items: candidates.filter((c) => c.role === role),
  }));

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <select className="portal-input" style={{ minWidth: 260 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
        {grouped.map(
          ({ role, items }) =>
            items.length > 0 && (
              <optgroup key={role} label={ROLE_LABEL[role]}>
                {items.map((c) => (
                  <option key={`${c.role}:${c.userId}`} value={`${c.role}:${c.userId}`}>
                    {c.fullName} — {c.detail}
                  </option>
                ))}
              </optgroup>
            ),
        )}
      </select>
      <button type="button" className="btn btn-primary btn-sm" onClick={start} disabled={starting}>
        {starting ? "Starting…" : "View as"}
      </button>
    </div>
  );
}
