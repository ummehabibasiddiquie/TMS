"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  ArrowRightCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";
import { ProgressBandBadge } from "@/components/learning/ProgressBandBadge";
import { dueBadgeClass, type DayDueInfo, type DueSummary } from "@/lib/day-due";
import { formatCertActionBy } from "@/lib/cert-reviewer";
import { formatDisplayDate } from "@/lib/format-date";

type PracticeProject = { id: string; name: string; dayNumber?: number };

type WorkByProject = {
  projectId: string;
  projectName: string;
  dayNumber?: number;
  hoursLogged: number | null;
  productionUnits: number | null;
  productionTarget?: number | null;
  productionScorePercent?: number | null;
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
  productionTarget?: number | null;
  assignedHours?: number | null;
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
    productionTargetUnits?: number | null;
    productionScorePercent: number | null;
    workOverallPercent: number | null;
    workDaysExpected: number;
    workDaysDueThroughToday?: number;
    workDaysLogged: number;
    entries: number;
    qualityScore: number | null;
    qualityScoreLoggedAvg?: number | null;
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
      return "Waiting for decision";
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

function workPercentClass(score: number | null | undefined) {
  if (score == null) return "text-slate-500";
  if (score >= 90) return "text-emerald-700 dark:text-emerald-300";
  if (score >= 70) return "text-amber-800 dark:text-amber-200";
  return "text-red-700 dark:text-red-300";
}

function fmtWorkPercent(score: number | null | undefined) {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return `${Math.round(Number(score) * 10) / 10}%`;
}

function quizClass(score: number | null | undefined) {
  return workPercentClass(score);
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

function isScheduleWorkDay(d: DayDueRow) {
  return Boolean(d.hasTrainingWork || d.hrmsProjectId || d.projectName?.trim());
}

function workMetricLogged(w?: WorkByProject | null) {
  if (!w) return false;
  return (
    w.hoursLogged != null ||
    w.productionUnits != null ||
    w.qualityScore != null
  );
}

function trainingWorkDayLines(r: Row) {
  const metricsByDay = new Map<number, WorkByProject>();
  for (const w of r.workByProject || []) {
    if (w.dayNumber != null) metricsByDay.set(w.dayNumber, w);
  }
  const seen = new Set<number>();
  const rows: { dayNumber: number; label: string; detail: string; status?: string }[] =
    [];

  for (const d of (r.days || []).slice().sort((a, b) => a.dayNumber - b.dayNumber)) {
    if (!isScheduleWorkDay(d)) continue;
    seen.add(d.dayNumber);
    const m = metricsByDay.get(d.dayNumber);
    const project =
      d.projectName?.trim() ||
      m?.projectName?.trim() ||
      d.title ||
      `Day ${d.dayNumber}`;
    rows.push(formatWorkDayLine(r.currentDay, d.dayNumber, project, d, m));
  }
  for (const p of r.practiceProjects || []) {
    if (p.dayNumber == null || seen.has(p.dayNumber)) continue;
    const d = (r.days || []).find((x) => x.dayNumber === p.dayNumber);
    if (d && !isScheduleWorkDay(d)) continue;
    seen.add(p.dayNumber);
    const m = metricsByDay.get(p.dayNumber);
    rows.push(
      formatWorkDayLine(r.currentDay, p.dayNumber, p.name, d, m)
    );
  }
  return rows.sort((a, b) => a.dayNumber - b.dayNumber);
}

function fmtProdRatio(
  achieved: number | null | undefined,
  target: number | null | undefined
): string {
  const goal =
    target != null && Number.isFinite(target) && target > 0
      ? Math.round(target)
      : null;
  if (goal == null) return "—";
  const done =
    achieved != null && Number.isFinite(achieved) ? Math.round(achieved) : 0;
  return `${done}/${goal}`;
}

function fmtUnitsAchievedTarget(
  achieved: number | null | undefined,
  target: number | null | undefined
): string | null {
  const goal =
    target != null && Number.isFinite(target) && target > 0
      ? Math.round(target)
      : null;
  if (goal == null) {
    if (achieved != null && Number.isFinite(achieved)) return `${achieved} units`;
    return null;
  }
  const done =
    achieved != null && Number.isFinite(achieved) ? Math.round(achieved) : 0;
  return `${done}/${goal} units`;
}

function formatWorkDayLine(
  currentDay: number,
  dayNumber: number,
  project: string,
  day: DayDueRow | undefined,
  m: WorkByProject | undefined
): { dayNumber: number; label: string; detail: string; status?: string } {
  const target =
    m?.productionTarget ??
    day?.productionTarget ??
    null;

  if (dayNumber > currentDay) {
    const ratio = fmtProdRatio(null, target);
    return {
      dayNumber,
      label: `Day ${dayNumber} · ${project}`,
      detail: ratio !== "—" ? `${ratio} · upcoming` : "Upcoming",
      status: "upcoming",
    };
  }
  if (!workMetricLogged(m)) {
    const ratio = fmtProdRatio(0, target);
    return {
      dayNumber,
      label: `Day ${dayNumber} · ${project}`,
      detail: ratio !== "—" ? ratio : "Pending",
      status: "pending",
    };
  }

  const parts: string[] = [];
  const ratio = fmtProdRatio(m?.productionUnits ?? null, target);
  if (ratio !== "—") parts.push(ratio);
  if (m?.qualityScore != null) parts.push(`${m.qualityScore}% Q`);

  return {
    dayNumber,
    label: `Day ${dayNumber} · ${project}`,
    detail: parts.length > 0 ? parts.join(" · ") : "Logged",
    status: "done",
  };
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

  async function promoteToNextDay(
    traineeId: string,
    name: string,
    totalDays: number,
    currentDay: number
  ) {
    if (currentDay >= totalDays) {
      setMsg(`${name} is already on the last day (Day ${totalDays}). Use + Extra days to extend.`);
      return;
    }
    const dayNumber = currentDay + 1;
    if (!confirm(`Open Day ${dayNumber} for ${name}?`)) return;

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
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Trainee progress</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Learning = curriculum completion. Work = one score (average of production vs unit goal
            and quality on logged days); breakdown shown under each trainee.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin/work-metrics"
            className="font-medium text-blue-700 hover:text-blue-900 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            Work Metrics
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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {!error && rows.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-500">No trainees found.</p>
      ) : null}

      {rows.length > 0 ? (
        <div
          className={`${listShell} ${busyId ? "pointer-events-none opacity-70" : ""}`}
        >
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((r) => {
              const open = expanded === r.id;
              const learning = r.learningPercent ?? r.overallPercent;
              const projects = r.practiceProjects || [];
              const hasProjects = projects.length > 0;
              const work = r.workByProject || [];
              const summary = r.workSummary;
              const busy = busyId === r.id;
              const quiz = r.finalQuizScore;
              const displayQuizScore =
                quiz != null ? quiz : r.quizRetakePending ? r.lastFinalQuizScore : null;
              const due = r.dueSummary;
              const currentDayDue = (r.days || []).find(
                (d) => d.dayNumber === r.currentDay
              )?.due;
              const delayedDays = (r.days || []).filter(
                (d) =>
                  d.due?.status === "OVERDUE" ||
                  d.due?.status === "DONE_LATE" ||
                  d.due?.status === "DUE_TODAY"
              );
              const workPending = pendingWorkCount(r);
              const workDayLines = trainingWorkDayLines(r);

              const qualityLoggedAvg =
                summary?.qualityScoreLoggedAvg ??
                (() => {
                  let s = 0;
                  let n = 0;
                  for (const w of work) {
                    if (w.qualityScore != null) {
                      s += w.qualityScore;
                      n += 1;
                    }
                  }
                  return n > 0 ? Math.round((s / n) * 10) / 10 : null;
                })();
              const totalUnits = summary?.productionUnits;
              const targetUnits = summary?.productionTargetUnits ?? null;
              const workCombinedPct = summary?.workOverallPercent ?? null;
              const workMain = fmtWorkPercent(workCombinedPct);

              const prodRatio = fmtProdRatio(
                totalUnits ?? (targetUnits != null ? 0 : null),
                targetUnits
              );
              const workTotalsParts: string[] = [];
              if (totalUnits != null) workTotalsParts.push(`${totalUnits} units`);
              if (summary?.hoursLogged != null) {
                workTotalsParts.push(`${fmt(summary.hoursLogged)}h`);
              }
              const loggedDays = summary?.workDaysLogged ?? summary?.entries ?? 0;
              if (loggedDays > 0) {
                workTotalsParts.push(`${loggedDays} day${loggedDays === 1 ? "" : "s"}`);
              }
              const workDetail =
                workTotalsParts.length > 0 ? workTotalsParts.join(" · ") : null;

              const workBreakdownParts: string[] = [];
              if (prodRatio !== "—") {
                workBreakdownParts.push(`Prod ${prodRatio}`);
              } else if ((summary?.workDaysExpected ?? 0) > 0 || work.length > 0) {
                workBreakdownParts.push("Prod —");
              }
              if (qualityLoggedAvg != null) {
                workBreakdownParts.push(`Qual ${fmtWorkPercent(qualityLoggedAvg)}`);
              } else if ((summary?.workDaysExpected ?? 0) > 0 || work.length > 0) {
                workBreakdownParts.push("Qual —");
              }
              const workBreakdown =
                workBreakdownParts.length > 0 ? workBreakdownParts.join(" · ") : null;

              const quizMain =
                quiz == null
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
                [r.band?.label, r.evaluationCycle != null ? `Quiz Round ${r.evaluationCycle}` : null]
                  .filter(Boolean)
                  .join(" · ") || null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={r.id} className="min-w-0 bg-white dark:bg-slate-950/40">
                  <div className="grid grid-cols-1 items-start gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
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
                          {r.isCustom && (
                            <span className="text-slate-500 dark:text-slate-600">Custom</span>
                          )}
                          {r.scheduleComplete && (
                            <span className="text-emerald-700 dark:text-emerald-400/90">
                              Schedule Done
                            </span>
                          )}
                          {r.trainingStart && (
                            <span className="text-slate-500 dark:text-slate-600">
                              Joined {formatDisplayDate(r.trainingStart)}
                            </span>
                          )}
                          {due && due.doneLateCount > 0 && (
                            <span className="text-orange-800 dark:text-amber-300/90">
                              {due.doneLateCount} done late
                            </span>
                          )}
                          {r.finalQuizCertificateStatus === "PENDING_REVIEW" &&
                            quiz != null && (
                              <span className="text-amber-800 dark:text-amber-300">
                                Cert pending
                              </span>
                            )}
                          {currentDayDue?.status === "DUE_TODAY" && (
                            <span className="text-amber-800 dark:text-amber-200">
                              Due today
                            </span>
                          )}
                          {currentDayDue?.status === "OVERDUE" && (
                            <span className="text-red-700 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                          {currentDayDue?.status !== "DUE_TODAY" &&
                            currentDayDue?.status !== "OVERDUE" &&
                            due &&
                            due.overdueCount > 0 && (
                              <span className="text-red-700 dark:text-red-300">
                                Overdue
                              </span>
                            )}
                          {currentDayDue?.status !== "DUE_TODAY" &&
                            due &&
                            due.dueTodayCount > 0 &&
                            due.overdueCount === 0 && (
                              <span className="text-amber-800 dark:text-amber-200">
                                Due today
                              </span>
                            )}
                          {r.todayTitle && (
                            <span className="text-slate-500 dark:text-slate-600">
                              · {r.todayTitle}
                              {r.todayDone ? " ✓" : ""}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>

                    <div className="grid min-w-0 grid-cols-3 gap-2 lg:gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Learning
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {learning}%
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Work
                        </p>
                        <p
                          className={`text-sm font-semibold tabular-nums ${workPercentClass(workCombinedPct)}`}
                          title={
                            workBreakdown
                              ? `Combined: ${workMain} (${workBreakdown})`
                              : "Work vs scheduled training-work days"
                          }
                        >
                          {workMain}
                        </p>
                        {workBreakdown && (
                          <p className="mt-0.5 whitespace-normal break-words text-[10px] leading-snug tabular-nums text-slate-500 dark:text-slate-400">
                            {workBreakdown}
                          </p>
                        )}
                        {workDetail && (
                          <p className="whitespace-normal break-words text-[10px] leading-snug tabular-nums text-slate-500 dark:text-slate-400">
                            {workDetail}
                          </p>
                        )}
                        {workPending > 0 && (
                          <Link
                            href={`/admin/work-metrics?traineeId=${encodeURIComponent(r.id)}`}
                            className="mt-0.5 inline-block text-[10px] font-medium text-amber-800 hover:underline dark:text-amber-300"
                            onClick={(e) => e.stopPropagation()}
                            title={`${workPending} need entry`}
                          >
                            {workPending} pending
                          </Link>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Quiz
                        </p>
                        <p
                          className={`text-sm font-semibold tabular-nums ${quizClass(displayQuizScore ?? quiz)}`}
                          title={quizSub || quizMain}
                        >
                          {quizMain}
                        </p>
                      </div>
                    </div>

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
                          disabled={!!busyId || r.currentDay >= r.totalDays}
                          onClick={() =>
                            promoteToNextDay(
                              r.id,
                              r.name,
                              r.totalDays,
                              r.currentDay
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-800 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-200 dark:hover:bg-sky-950/50"
                          title={
                            r.currentDay >= r.totalDays
                              ? "Already on the last scheduled day"
                              : `Open Day ${r.currentDay + 1}`
                          }
                        >
                          <ArrowRightCircle className="h-3 w-3" />
                          Next day
                        </button>
                      )}
                      {r.canExtendWeek !== false && (
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => extendWeek(r.id, r.name)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40"
                          title="Add extra training days to the schedule"
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3 shrink-0" />
                          )}
                          Extra days
                        </button>
                      )}
                    </div>
                  </div>

                  {hasProjects && !open && (
                    <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600 sm:px-5 sm:pl-11 dark:border-slate-800/60 dark:text-slate-500">
                      Projects:{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-400">
                        {fmtProjectList(projects)}
                      </span>
                    </p>
                  )}

                  {open && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:pl-11 dark:border-slate-800 dark:bg-slate-900/30">
                      {workDayLines.length > 0 && (
                        <div className={delayedDays.length > 0 ? "mb-3" : ""}>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Work by day
                          </p>
                          <ul className="space-y-1">
                            {workDayLines.map((line) => (
                              <li
                                key={line.dayNumber}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                              >
                                <span className="min-w-0 text-slate-800 dark:text-slate-300">
                                  {line.label}
                                </span>
                                <span
                                  className={`shrink-0 tabular-nums ${
                                    line.status === "pending"
                                      ? "text-amber-800 dark:text-amber-300"
                                      : line.status === "upcoming"
                                        ? "text-slate-500"
                                        : "text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {line.detail}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {delayedDays.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Due status
                          </p>
                          <ul className="space-y-1">
                            {delayedDays.map((d) => (
                              <li
                                key={d.dayNumber}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                              >
                                <span className="text-slate-800 dark:text-slate-300">
                                  Day {d.dayNumber}
                                </span>
                                <span
                                  className={`shrink-0 tabular-nums ${dueBadgeClass(
                                    d.due.status
                                  )}`}
                                >
                                  {d.due.label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {delayedDays.length === 0 && workDayLines.length === 0 && (
                        <p className="text-xs text-slate-500">Nothing to expand yet.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
