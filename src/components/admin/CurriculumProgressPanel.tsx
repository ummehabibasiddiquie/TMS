"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

type PracticeProject = { id: string; name: string };

type WorkByProject = {
  projectId: string;
  projectName: string;
  hoursLogged: number | null;
  productionUnits: number | null;
  entries: number;
  qualityScore: number | null;
  qcSamples: number;
  lastActivityAt: string | null;
  message?: string;
};

type Row = {
  id: string;
  name: string;
  email: string;
  currentDay: number;
  totalDays: number;
  plannedDays?: number;
  overallPercent: number;
  learningPercent?: number;
  todayTitle: string | null;
  todayDone: boolean;
  trainingStatus: string | null;
  readyForProduction?: boolean;
  canExtendWeek?: boolean;
  isCustom?: boolean;
  currentPhase?: string;
  hasPracticeWork?: boolean;
  practiceProjects?: PracticeProject[];
  workByProject?: WorkByProject[];
  workSummary?: {
    hoursLogged: number | null;
    productionUnits: number | null;
    entries: number;
    qualityScore: number | null;
  };
  workMeta?: { configured?: boolean; connected?: boolean; message?: string };
  finalQuizScore?: number | null;
  scheduleComplete?: boolean;
};

function phaseLabel(phase?: string) {
  switch (phase) {
    case "APPROVED_IN_ORG":
      return "Approved in org";
    case "REJECTED":
      return "Rejected";
    case "AWAITING_EVALUATION":
      return "Awaiting evaluation";
    case "PRACTICE_WORK":
      return "Practice work";
    case "LEARNING":
      return "Learning";
    default:
      return "In training";
  }
}

function phaseClass(phase?: string) {
  switch (phase) {
    case "APPROVED_IN_ORG":
      return "text-emerald-400";
    case "REJECTED":
      return "text-red-400";
    case "AWAITING_EVALUATION":
      return "text-violet-300";
    case "PRACTICE_WORK":
      return "text-amber-300";
    default:
      return "text-slate-400";
  }
}

export function CurriculumProgressPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        : `Added Days ${data.fromDay}–${data.toDay}. Select a new day to add content.`
    );
    await load();
  }

  if (loading) return <p className="text-sm text-slate-400">Loading day-wise progress…</p>;
  if (error) return <p className="text-sm text-amber-300">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Trainee progress</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Learning = day schedule. Practice work = HRMS metrics for projects attached on curriculum
            days (dynamic — Lead/Admin decide when work starts). Use schedule + work + final quiz to
            decide.
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
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium w-8" />
                <th className="px-3 py-2 font-medium">Trainee</th>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Learning</th>
                <th className="px-3 py-2 font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">HRMS work</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canExtend = r.canExtendWeek !== false;
                const open = Boolean(expanded[r.id]);
                const learning = r.learningPercent ?? r.overallPercent;
                const projects = r.practiceProjects || [];
                const summary = r.workSummary;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`border-t border-slate-800 ${
                        r.currentPhase === "AWAITING_EVALUATION" ? "bg-violet-950/15" : ""
                      }`}
                    >
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                          }
                          aria-label={open ? "Collapse" : "Expand"}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
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
                        {r.todayTitle && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Today: {r.todayTitle}
                            {r.todayDone ? " · done" : ""}
                          </p>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-xs font-medium ${phaseClass(r.currentPhase)}`}>
                        {phaseLabel(r.currentPhase)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${learning}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{learning}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">
                        {projects.length === 0 ? (
                          <span className="text-slate-600">None yet</span>
                        ) : (
                          projects.map((p) => p.name).join(", ")
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">
                        {projects.length === 0 ? (
                          <span className="text-slate-600">—</span>
                        ) : summary && summary.entries > 0 ? (
                          <span>
                            {summary.qualityScore != null && (
                              <>QC {summary.qualityScore}% · </>
                            )}
                            {summary.hoursLogged != null && <>{summary.hoursLogged}h · </>}
                            {summary.productionUnits != null && (
                              <>{summary.productionUnits} units</>
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-400/80">No tracker rows yet</span>
                        )}
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
                              title="Add extra week for this trainee only"
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
                    {open && (
                      <tr className="border-t border-slate-800/50 bg-slate-950/40">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Practice projects (HRMS)
                              </p>
                              {(r.workByProject || []).length === 0 ? (
                                <p className="mt-2 text-sm text-slate-500">
                                  Attach an HRMS project on a curriculum day to track practice work.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {(r.workByProject || []).map((w) => (
                                    <li
                                      key={w.projectId}
                                      className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
                                    >
                                      <p className="font-medium text-slate-100">{w.projectName}</p>
                                      <p className="mt-1 text-xs text-slate-400">
                                        Entries: {w.entries}
                                        {w.hoursLogged != null && ` · Hours: ${w.hoursLogged}`}
                                        {w.productionUnits != null &&
                                          ` · Production: ${w.productionUnits}`}
                                        {w.qualityScore != null &&
                                          ` · QC: ${w.qualityScore}% (${w.qcSamples})`}
                                      </p>
                                      {w.lastActivityAt && (
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          Last activity:{" "}
                                          {new Date(w.lastActivityAt).toLocaleString()}
                                        </p>
                                      )}
                                      {w.message && (
                                        <p className="mt-1 text-[11px] text-amber-300/90">
                                          {w.message}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {r.workMeta?.message && (
                                <p className="mt-2 text-[11px] text-amber-300/80">
                                  {r.workMeta.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Evaluation signals
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                                <li>
                                  Schedule:{" "}
                                  {r.scheduleComplete ? (
                                    <span className="text-emerald-400">Complete</span>
                                  ) : (
                                    <span>{learning}% learning progress</span>
                                  )}
                                </li>
                                <li>
                                  Final quiz:{" "}
                                  {r.finalQuizScore != null
                                    ? `${Math.round(r.finalQuizScore)}%`
                                    : "Not taken"}
                                </li>
                                <li className="text-xs text-slate-500">
                                  Admin decides from schedule completion, HRMS work quality/hours,
                                  and final quiz — not quiz alone.
                                </li>
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
