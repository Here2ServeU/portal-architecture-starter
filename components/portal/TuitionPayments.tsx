"use client";

import { useEffect, useState } from "react";

type Row = {
  studentId: string;
  fullName: string;
  grade: number;
  status: "paid" | "unpaid";
  amount: number | null;
  paidAt: string | null;
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Per-student monthly tuition tracker — "who's paid and who hasn't" for the
 * current month, toggled inline. See app/api/portal/tuition-payments/route.ts.
 */
export default function TuitionPayments({ institutionId }: { institutionId: string }) {
  const [period] = useState(currentPeriod());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/portal/tuition-payments?institutionId=${institutionId}&period=${period}`)
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((data) => !cancelled && setRows(data.rows ?? []))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [institutionId, period]);

  async function toggle(row: Row) {
    const nextStatus = row.status === "paid" ? "unpaid" : "paid";
    setPending(row.studentId);
    try {
      const res = await fetch("/api/portal/tuition-payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, studentId: row.studentId, period, status: nextStatus }),
      });
      if (res.ok) {
        setRows((prev) =>
          (prev ?? []).map((r) =>
            r.studentId === row.studentId
              ? { ...r, status: nextStatus, paidAt: nextStatus === "paid" ? new Date().toISOString() : null }
              : r,
          ),
        );
      }
    } finally {
      setPending(null);
    }
  }

  if (rows === null) return <p className="muted">Loading…</p>;
  if (rows.length === 0) return <p className="muted">No enrolled students yet.</p>;

  const paidCount = rows.filter((r) => r.status === "paid").length;

  return (
    <div>
      <p style={{ marginBottom: 12 }} className="muted">
        {paidCount} of {rows.length} paid for {period}
      </p>
      <div className="ps-roster-table">
        <div className="ps-roster-row ps-roster-head" style={{ gridTemplateColumns: "2fr 0.8fr 1fr" }}>
          <div>Student</div>
          <div>Grade</div>
          <div>This month</div>
        </div>
        {rows.map((r) => (
          <div key={r.studentId} className="ps-roster-row" style={{ gridTemplateColumns: "2fr 0.8fr 1fr" }}>
            <div className="ps-roster-name">{r.fullName}</div>
            <div className="ps-status">{r.grade}</div>
            <button
              type="button"
              className={`btn btn-sm ${r.status === "paid" ? "btn-secondary" : "btn-primary"}`}
              onClick={() => toggle(r)}
              disabled={pending === r.studentId}
            >
              {pending === r.studentId ? "…" : r.status === "paid" ? "Paid ✓" : "Mark paid"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
