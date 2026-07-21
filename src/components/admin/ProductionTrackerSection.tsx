"use client";

import { useEffect, useState } from "react";
import { TrackerProgressPanel } from "@/components/tracker/TrackerProgressPanel";

type Row = {
  id: string;
  name: string;
  email: string;
  readyForProduction?: boolean;
  trainingStatus?: string | null;
};

/** Lists org-approved trainees with tracker summaries for Admin / Team Lead. */
export function ProductionTrackerSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/curriculum/progress");
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return;
      const production = (data.trainees || []).filter(
        (t: Row) =>
          t.readyForProduction || t.trainingStatus === "APPROVED_IN_ORG"
      );
      setRows(production);
    })();
  }, []);

  if (loading) return null;
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold">Production (Tracker)</h2>
        <p className="mt-2 text-sm text-slate-500">
          No approved trainees yet. After Admin approval (based on overall performance), they
          appear here with tracker production work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Production (Tracker)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trainees approved into the org — live work from the tracker DB when connected.
        </p>
      </div>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2">
            <p className="text-sm font-medium text-slate-200">
              {r.name}{" "}
              <span className="text-xs font-normal text-slate-500">{r.email}</span>
            </p>
            <TrackerProgressPanel userId={r.id} forceShow compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
