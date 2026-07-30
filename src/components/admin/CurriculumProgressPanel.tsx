"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  ArrowRightCircle,
  Loader2,
} from "lucide-react";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";
import { ProgressBandBadge } from "@/components/learning/ProgressBandBadge";
import { dueBadgeClass, type DayDueInfo, type DueSummary } from "@/lib/day-due";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/format-date";
import { formatCertActionBy } from "@/lib/cert-reviewer";

type PracticeProject = { id: string; name: string; dayNumber?: number };

type WorkByProject = {
  projectId: string;
  projectName: string;
  dayNumber?: number;
  hoursLogged: number | null;
  productionUnits: number | null;
  entries: number;
  qualityScore: number | null;
  qcSamples: number;
  lastActivityAt: string | null;
  message?: string;
};

type DayDueRow = {
  dayNumber: number;
  title: string;
  done: boolean;
  percent: number;
  completedAt: string | null;
  due: DayDueInfo;
  projectName?: string | null;
  hrmsProjectId?: string | null;
  hasTrainingWork?: boolean;
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
  lastFinalQuizScore?: number | null;
  finalQuizAttemptedAt?: string | null;
  evaluationCycle?: number;
  quizRetakePending?: boolean;
  quizRetakeGrantedAt?: string | null;
  quizRetakeGrantedBy?: { id: string; name: string; role: string } | null;
  previousQuizAttempts?: { cycle: number; score: number; createdAt: string }[];
  finalQuizCertificateStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  finalQuizCertificateReviewedBy?: { id: string; name: string; role: string } | null;
  scheduleComplete?: boolean;
  forcedDay?: number | null;
  autoDay?: number | null;
  band?: { band?: string; label?: string };
  trainingStart?: string | null;
  dueSummary?: DueSummary;
  days?: DayDueRow[];
};

function phaseLabel(phase?: string) {
  switch (phase) {
    case "APPROVED_IN_ORG":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "AWAITING_EVALUATION":
      return "Awaiting decision";
    case "PRACTICE_WORK":
      return "Practice";
    case "LEARNING":
      return "Learning";
    default:
      return "Training";
  }
}

function phaseDot(phase?: string) {
  switch (phase) {
    case "APPROVED_IN_ORG":
      return "bg-emerald-400";
    case "REJECTED":
      return "bg-red-400";
    case "AWAITING_EVALUATION":
      return "bg-violet-400";
    case "PRACTICE_WORK":
      return "bg-amber-400";
    default:
      return "bg-slate-500";
  }
}

function fmt(v: number | null | undefined, suffix = "") {
  if (v == null) return "—";
  return `${v}${suffix}`;
}

function quizClass(score: number | null | undefined) {
  if (score == null) return "text-slate-500";
  if (score >= 90) return "text-emerald-700 dark:text-emerald-300";
  if (score >= 70) return "text-amber-800 dark:text-amber-200";
  return "text-red-700 dark:text-red-300";
}

const listShell =
  "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none";

function fmtProjectList(projects: PracticeProject[]) {
  return projects
    .map((p) => (p.dayNumber != null ? `${p.name} (D${p.dayNumber})` : p.name))
    .join(" · ");
}

function pendingWorkCount(r: Row) {
  const through = Math.max(1, r.currentDay || 1);
  const submitted = new Set(
    (r.workByProject || [])
      .filter(
        (w) =>
          w.dayNumber != null &&
          (w.hoursLogged != null ||
            w.productionUnits != null ||
            w.qualityScore != null)
      )
      .map((w) => w.dayNumber as number)
  );
  const workDays = new Set<number>();
  for (const d of r.days || []) {
    if (d.dayNumber > through) continue;
    if (d.hasTrainingWork || d.hrmsProjectId || d.projectName) {
      workDays.add(d.dayNumber);
    }
  }
  for (const p of r.practiceProjects || []) {
    if (p.dayNumber != null && p.dayNumber <= through) workDays.add(p.dayNumber);
  }
  let n = 0;
  for (const day of workDays) {
    if (!submitted.has(day)) n += 1;
  }
  return n;
}

/**
 * Compact progress list: key signals always visible; project/eval detail on expand.
 */
export function CurriculumProgressPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggleExpanded(traineeId: string) {
    const scrollY = window.scrollY;
    setExpanded((current) => (current === traineeId ? null : traineeId));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    });
  }

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await fetch("/api/curriculum/progress");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      setError("");
      setRows(data.trainees || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function extendWeek(traineeId: string, name: string) {
    const raw = prompt(
      `How many extra days for ${name}?\n7 = one week, 14 = two weeks. Max 60.`,
      "7"
    );
    if (raw == null) return;
    const days = Number(raw.trim());
    if (!Number.isFinite(days) || days < 1 || days > 60) {
      setMsg("Enter a number of days between 1 and 60");
      return;
    }
    if (!confirm(`Add ${days} day${days === 1 ? "" : "s"} for ${name}?`)) return;

    setBusyId(traineeId);
    setBusyLabel(`Adding ${days} day${days === 1 ? "" : "s"} for ${name}…`);
    setMsg("");
    try {
      const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extendWeek", days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not extend training");
        return;
      }
      setBusyLabel("Refreshing…");
      await load({ quiet: true });
      setMsg(
        `Added ${data.added ?? days} day(s) for ${name} (Days ${data.fromDay}–${data.toDay}).`
      );
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  }

  async function promoteDay(
    traineeId: string,
    name: string,
    totalDays: number,
    currentDay: number
  ) {
    const raw = prompt(
      `Open which day for ${name}? (1–${totalDays})`,
      String(Math.min(totalDays, currentDay + 1))
    );
    if (raw == null) return;
    const dayNumber = Number(raw.trim());
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > totalDays) {
      setMsg(`Enter a day between 1 and ${totalDays}`);
      return;
    }
    setBusyId(traineeId);
    setBusyLabel(`Opening Day ${dayNumber} for ${name}…`);
    setMsg("");
    try {
      const res = await fetch(`/api/curriculum/trainee/${traineeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setDay", dayNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not change day");
        return;
      }
      setBusyLabel("Refreshing…");
      await load({ quiet: true });
      setMsg(`${name} → Day ${data.currentDay}`);
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  }

  if (loading && rows.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Trainee progress</h2>
        <SectionLoader message="Loading progress…" />
      </section>
    );
  }
  if (error && rows.length === 0) {
    return (
      <p className="text-sm text-amber-900 dark:text-amber-200">{error}</p>
    );
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Trainee progress</h2>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin/work-metrics"
            className="font-medium text-blue-700 hover:text-blue-900 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            Work metrics
          </Link>
          <Link
            href="/admin/curriculum"
            className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
          >
            Curriculum
          </Link>
        </div>
      </div>

      {busyLabel && <WorkingBanner message={busyLabel} />}
      {msg && !busyLabel && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {msg}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-500">No trainees found.</p>
      ) : (
        <div
          className={`${listShell} ${busyId ? "pointer-events-none opacity-70" : ""}`}
        >
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((r) => {
              const open = expanded === r.id;
              const learning = r.learningPercent ?? r.overallPercent;
              const projects = r.practiceProjects || [];
              const work = r.workByProject || [];
              const summary = r.workSummary;
              const busy = busyId === r.id;
              const quiz = r.finalQuizScore;
              const displayQuizScore =
                quiz != null ? quiz : r.quizRetakePending ? r.lastFinalQuizScore : null;
              const hasWork = work.length > 0;
              const hasProjects = projects.length > 0;
              const extra =
                r.plannedDays != null && r.totalDays > r.plannedDays
                  ? r.totalDays - r.plannedDays
                  : 0;
              const due = r.dueSummary;
              const delayedDays = (r.days || []).filter(
                (d) =>
                  d.due?.status === "OVERDUE" ||
                  d.due?.status === "DONE_LATE" ||
                  d.due?.status === "DUE_TODAY"
              );
              const workPending = pendingWorkCount(r);

              const productionMain =
                summary?.productionUnits != null
                  ? String(summary.productionUnits)
                  : hasWork || hasProjects
                    ? "No data"
                    : "—";
              const qualityMain =
                summary?.qualityScore != null
                  ? `${summary.qualityScore}%`
                  : hasWork || hasProjects
                    ? "No data"
                    : "—";
              const quizMain = r.quizRetakePending
                ? "Retake open"
                : quiz == null
                  ? "—"
                  : `${Math.round(quiz)}%`;
              const quizSub = [
                r.finalQuizCertificateStatus === "APPROVED" &&
                r.finalQuizCertificateReviewedBy
                  ? formatCertActionBy("approved", r.finalQuizCertificateReviewedBy)
                  : null,
                r.finalQuizCertificateStatus === "REJECTED" &&
                r.finalQuizCertificateReviewedBy
                  ? formatCertActionBy("rejected", r.finalQuizCertificateReviewedBy)
                  : null,
                r.quizRetakePending && r.quizRetakeGrantedBy
                  ? formatCertActionBy("retake_open", r.quizRetakeGrantedBy)
                  : null,
                [r.band?.label, r.evaluationCycle != null ? `cycle ${r.evaluationCycle}` : null]
                  .filter(Boolean)
                  .join(" · ") || null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={r.id} className="min-w-0 bg-white dark:bg-slate-950/40">
                  <div className="grid grid-cols-1 items-start gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
                    {/* Identity */}
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => toggleExpanded(r.id)}
                      className="flex min-w-0 items-start gap-2.5 text-left disabled:opacity-50 lg:col-span-1"
                    >
                      {busy ? (
                        <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-blue-400" />
                      ) : (
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition dark:text-slate-600 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-slate-900 dark:text-white">
                            {r.name}
                          </span>
                          <ProgressBandBadge
                            overallPercent={learning}
                            currentDay={r.currentDay}
                            totalDays={r.totalDays}
                          />
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${phaseDot(
                                r.currentPhase
                              )}`}
                            />
                            {phaseLabel(r.currentPhase)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {r.email}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            Day {r.currentDay}
                            {r.totalDays > 0 ? `/${r.totalDays}` : ""}
                          </span>
                          {extra > 0 && (
                            <span className="text-amber-800 dark:text-amber-300/90">+{extra} extra</span>
                          )}
                          {r.forcedDay != null && (
                            <span className="text-sky-800 dark:text-sky-300/90">day set</span>
                          )}
                          {r.isCustom && <span className="text-slate-500 dark:text-slate-600">custom</span>}
                          {r.scheduleComplete && (
                            <span className="text-emerald-700 dark:text-emerald-400/90">schedule done</span>
                          )}
                          {r.quizRetakePending && (
                            <span className="text-violet-700 dark:text-violet-300">retake granted</span>
                          )}
                          {r.finalQuizCertificateStatus === "PENDING_REVIEW" && quiz != null && (
                            <span className="text-amber-800 dark:text-amber-300">cert pending</span>
                          )}
                          {r.trainingStart && (
                            <span className="text-slate-500 dark:text-slate-600">
                              joined {formatDisplayDate(r.trainingStart)}
                            </span>
                          )}
                          {due && due.overdueCount > 0 && (
                            <span className="text-red-700 dark:text-red-300">
                              {due.overdueCount} overdue
                              {due.maxOverdueDays > 0
                                ? ` (max ${due.maxOverdueDays}d)`
                                : ""}
                            </span>
                          )}
                          {due && due.dueTodayCount > 0 && (
                            <span className="text-amber-800 dark:text-amber-200">
                              {due.dueTodayCount} due today
                            </span>
                          )}
                          {due && due.doneLateCount > 0 && (
                            <span className="text-orange-800 dark:text-amber-300/90">
                              {due.doneLateCount} done late
                            </span>
                          )}
                          {r.todayTitle && (
                            <span className="truncate text-slate-500 dark:text-slate-600">
                              · {r.todayTitle}
                              {r.todayDone ? " ✓" : ""}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>

                    {/* Metrics — 4 equal columns, fits container (no horizontal scroll) */}
                    <div className="grid min-w-0 grid-cols-4 gap-2 lg:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Learning
                        </p>
                        <p className="truncate text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {learning}%
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Production
                        </p>
                        <p
                          className={`truncate text-sm font-semibold tabular-nums ${
                            summary?.productionUnits != null
                              ? "text-slate-900 dark:text-white"
                              : "font-normal text-slate-500"
                          }`}
                          title={productionMain}
                        >
                          {productionMain}
                        </p>
                        {workPending > 0 && (
                          <Link
                            href={`/admin/work-metrics?traineeId=${encodeURIComponent(r.id)}`}
                            className="truncate text-[10px] font-medium text-amber-800 hover:underline dark:text-amber-300"
                            onClick={(e) => e.stopPropagation()}
                            title={`${workPending} need entry`}
                          >
                            {workPending} pending
                          </Link>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Quality
                        </p>
                        <p
                          className={`truncate text-sm font-semibold tabular-nums ${
                            summary?.qualityScore != null
                              ? "text-slate-900 dark:text-white"
                              : "font-normal text-slate-500"
                          }`}
                        >
                          {qualityMain}
                        </p>
                        {(hasWork || summary?.entries) && (
                          <p className="truncate text-[10px] tabular-nums text-slate-500">
                            {fmt(summary?.hoursLogged)}h · {summary?.entries ?? 0}d
                          </p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Quiz
                        </p>
                        <p
                          className={`truncate text-sm font-semibold tabular-nums ${
                            r.quizRetakePending
                              ? "text-violet-800 dark:text-violet-300"
                              : quizClass(displayQuizScore ?? quiz)
                          }`}
                          title={quizSub || quizMain}
                        >
                          {quizMain}
                          {r.quizRetakePending && displayQuizScore != null
                            ? ` · was ${Math.round(displayQuizScore)}%`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                      <Link
                        href={`/admin/curriculum?traineeId=${encodeURIComponent(r.id)}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Schedule
                      </Link>
                      {r.totalDays > 0 && (
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() =>
                            promoteDay(r.id, r.name, r.totalDays, r.currentDay)
                          }
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-800 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-200 dark:hover:bg-sky-950/50"
                        >
                          <ArrowRightCircle className="h-3 w-3" />
                          Set day
                        </button>
                      )}
                      {r.canExtendWeek !== false && (
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => extendWeek(r.id, r.name)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40"
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CalendarPlus className="h-3 w-3" />
                          )}
                          Days
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:pl-11 dark:border-slate-800 dark:bg-slate-900/30">
                      {hasProjects && (
                        <div className="mb-4">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Projects
                          </p>
                          <p className="text-sm text-slate-800 dark:text-slate-200">
                            {fmtProjectList(projects)}
                          </p>
                        </div>
                      )}
                      {delayedDays.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                            Due / delayed days
                          </p>
                          <ul className="space-y-1.5">
                            {delayedDays.map((d) => (
                              <li
                                key={d.dayNumber}
                                className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
                              >
                                <span className="text-slate-800 dark:text-slate-300">
                                  Day {d.dayNumber}: {d.title}
                                </span>
                                <span
                                  className={`tabular-nums ${dueBadgeClass(
                                    d.due.status
                                  )}`}
                                >
                                  {d.due.label}
                                  {d.due.dueDate ? ` · due ${formatDisplayDate(d.due.dueDate)}` : ""}
                                  {d.completedAt
                                    ? ` · done ${formatDisplayDate(d.completedAt)}`
                                    : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {delayedDays.length === 0 && (
                        <p className="text-sm text-slate-600 dark:text-slate-500">
                          No due / delayed days right now.
                        </p>
                      )}
                      {quizSub && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{quizSub}</p>
                      )}
                      {r.finalQuizAttemptedAt && (
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-600">
                          Quiz taken{" "}
                          {formatDisplayDateTime(r.finalQuizAttemptedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {hasProjects && !open && (
                    <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600 sm:px-5 sm:pl-11 dark:border-slate-800/60 dark:text-slate-500">
                      Projects:{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-400">
                        {fmtProjectList(projects)}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
