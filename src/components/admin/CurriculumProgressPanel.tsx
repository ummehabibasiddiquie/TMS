"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, ExternalLink } from "lucide-react";

type Row = {
  id: string;
  name: string;
  email: string;
  currentDay: number;
  totalDays: number;
  plannedDays?: number;
  overallPercent: number;
  todayTitle: string | null;
  todayDone: boolean;
  trainingStatus: string | null;
  readyForProduction?: boolean;
  canExtendWeek?: boolean;
  isCustom?: boolean;
};

export function CurriculumProgressPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/curriculum/progress");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setError("");
    setRows(data.trainees || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function extendWeek(traineeId: string, name: string) {
    if (
      !confirm(
        `Add the Extra week default schedule for ${name}?\n\nChecklist, courses, and work from “Extra week default” are copied to their personal schedule (editable afterward).`
      )
    ) {
      return;
    }
    setBusyId(traineeId);
    setMsg("");
    const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extendWeek", days: 7 }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMsg(data.error || "Could not extend training");
      return;
    }
    setMsg(
      data.fromTemplate
        ? `Extra week default copied as Days ${data.fromDay}–${data.toDay} for ${name}. Open Day Curriculum to adjust their copy.`
        : `Extra week (Days ${data.fromDay}–${data.toDay}) added for ${name}. Open Day Curriculum to add content.`
    );
    await load();
  }

  if (loading) return <p className="text-sm text-slate-400">Loading day-wise progress…</p>;
  if (error) return <p className="text-sm text-amber-300">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Day-wise training progress</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Schedule completion only (courses and practice quizzes). The board below includes the
            final quiz score as one signal — Admin decides from overall performance.
          </p>
        </div>
        <Link href="/admin/curriculum" className="text-sm text-blue-400 hover:underline">
          Manage curriculum
        </Link>
      </div>

      {msg && (
        <p className="rounded-xl bg-blue-500/10 px-3 py-2 text-sm text-blue-200">{msg}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No trainees found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Trainee</th>
                <th className="px-3 py-2 font-medium">Current day</th>
                <th className="px-3 py-2 font-medium">Today</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canExtend = r.canExtendWeek !== false;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-800 ${
                      r.trainingStatus === "AWAITING_EVALUATION" ? "bg-violet-950/15" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-100">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                      {r.isCustom && (
                        <p className="mt-0.5 text-[11px] text-amber-300">Custom schedule</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {r.totalDays > 0 ? (
                        <>
                          Day {r.currentDay} / {r.totalDays}
                          {r.plannedDays != null && r.totalDays > r.plannedDays ? (
                            <span className="ml-1 text-[11px] text-amber-300">
                              (+{r.totalDays - r.plannedDays} extra)
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-slate-300">{r.todayTitle || "—"}</span>
                      {r.todayDone && (
                        <span className="ml-2 text-xs text-emerald-400">done</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-slate-400">
                        {r.readyForProduction || r.trainingStatus === "APPROVED_IN_ORG"
                          ? "Approved in org"
                          : r.trainingStatus === "REJECTED"
                            ? "Rejected"
                            : r.trainingStatus === "AWAITING_EVALUATION"
                              ? "Awaiting evaluation"
                              : r.trainingStatus === "EXTENDED"
                                ? "Extended"
                                : r.isCustom
                                  ? "Custom"
                                  : "In training"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${r.overallPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{r.overallPercent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/curriculum?traineeId=${encodeURIComponent(r.id)}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Schedule
                        </Link>
                        {canExtend ? (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => extendWeek(r.id, r.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-xs text-amber-200 hover:bg-amber-900/50 disabled:opacity-50"
                            title="Add 7 extra days for this trainee only"
                          >
                            <CalendarPlus className="h-3 w-3" />
                            {busyId === r.id ? "Adding…" : "+1 week"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">No extend</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
