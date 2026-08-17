"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  BookOpen,
  History,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Eye,
  Briefcase,
  Layers,
  MessageSquare,
  Star,
} from "lucide-react";
import type { DaySnapshot, DayWisePlan, DayChecklistItem } from "@/lib/day-wise-training";
import { dueBadgeClass } from "@/lib/day-due";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/format-date";
import { TrackerProgressPanel } from "@/components/tracker/TrackerProgressPanel";
import { FinalExamGateCard } from "@/components/trainee/FinalEvaluationExam";
import { ProgressBandBadge } from "@/components/learning/ProgressBandBadge";
import { dueToneClass, formatFinishedLateLabel } from "@/lib/progress-band";

type Props = {
  plan: DayWisePlan;
};

const statCard =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/40 dark:shadow-none";

const panelCard =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none";

const itemRow =
  "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40";

const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

function LeadReviewCard({
  day,
  compact,
}: {
  day: DaySnapshot;
  compact?: boolean;
}) {
  const review = day.review;
  if (!review || (!review.notes && review.rating == null)) return null;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/40 dark:bg-blue-950/25"
          : "mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-950/30"
      }
    >
      <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
        <MessageSquare className="h-4 w-4 shrink-0" />
        {compact ? (
          <>
            Day {day.dayNumber}: {day.title}
          </>
        ) : (
          <>Feedback from your Team Lead</>
        )}
        {review.reviewerName ? (
          <span className="font-normal text-slate-600 dark:text-slate-400">· {review.reviewerName}</span>
        ) : null}
      </h3>
      {review.rating != null && (
        <p className="mb-2 inline-flex items-center gap-1 text-sm text-amber-200">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {review.rating}/5
        </p>
      )}
      {review.notes && (
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{review.notes}</p>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const getColor = () => {
    if (p < 20) return "bg-red-500";
    if (p < 40) return "bg-orange-500";
    if (p < 65) return "bg-amber-400";
    if (p < 85) return "bg-lime-500";
    return "bg-emerald-500";
  };
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all ${getColor()}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function DayItemsSummary({ day }: { day: DaySnapshot }) {
  const items: {
    key: string;
    title: string;
    done: boolean | null;
    tag: string;
    hours: number | null;
  }[] = [
    ...day.checklist.map((c) => ({
      key: c.id,
      title: c.title,
      done: c.completed as boolean | null,
      tag: "Checklist",
      hours: null as number | null,
    })),
    ...day.lessons.map((l) => ({
      key: l.linkId,
      title: l.label || l.title,
      done: l.completed as boolean | null,
      tag: "Course",
      hours: null as number | null,
    })),
    ...(day.workItems || []).map((c) => ({
      key: c.id,
      title: c.title,
      done: null as boolean | null,
      tag: "Work",
      hours: c.assignedHours,
    })),
  ];

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No items on this day.</p>;
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
          {item.done === null ? (
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : item.done ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
          )}
          <span className={item.done ? "text-slate-500 dark:text-slate-400" : ""}>
            <span className="mr-1.5 text-[10px] uppercase text-slate-500">{item.tag}</span>
            {item.title}
            {item.hours != null ? (
              <span className="ml-1 text-xs text-amber-800 dark:text-amber-200/80">({item.hours}h assigned)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

type DayWorkMetrics = {
  projectId: string;
  projectName: string;
  dayNumber?: number;
  hoursLogged: number | null;
  productionUnits: number | null;
  entries: number;
  qualityScore: number | null;
  lastActivityAt: string | null;
  message?: string;
};

function TrainingWorkPanel({
  day,
  workByProject,
  workLoading,
  workMessage,
}: {
  day: DaySnapshot;
  workByProject: DayWorkMetrics[];
  workLoading: boolean;
  workMessage?: string;
}) {
  const items = day.workItems || [];
  const dayMetrics =
    workByProject.find((p) => p.dayNumber === day.dayNumber) ||
    workByProject.find((p) => p.projectId === `day-${day.dayNumber}`) ||
    null;

  if (items.length === 0 && !dayMetrics) return null;

  function metricsFor(item: DayChecklistItem): DayWorkMetrics | null {
    if (dayMetrics) return dayMetrics;
    const name = (item.title || day.projectName || "").trim().toLowerCase();
    if (!name) return null;
    return (
      workByProject.find((p) => p.projectName.trim().toLowerCase() === name) ||
      workByProject.find((p) => p.projectName.toLowerCase().includes(name)) ||
      null
    );
  }

  const displayItems =
    items.length > 0
      ? items
      : [
          {
            id: `day-work-${day.dayNumber}`,
            title: day.projectName || day.title || `Day ${day.dayNumber} work`,
            description: null,
            sortOrder: 0,
            kind: "WORK" as const,
            assignedHours: null,
            productionTarget: null,
            completed: false,
          },
        ];

  return (
    <section>
      <h3 className={`mb-2 flex items-center gap-2 ${sectionLabel}`}>
        <Briefcase className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        Training Work
      </h3>
      <p className="mb-3 text-xs text-slate-600 dark:text-slate-500">
        Hours, production, and quality are recorded by Admin or your Team Lead in Work Metrics.
        Work metrics are entered by Admin or your Team Lead. When this day requires
        training work, metrics must be saved before the next day opens.
      </p>
      {workLoading && <p className="mb-2 text-xs text-slate-500">Loading work data…</p>}
      {workMessage && !workLoading && (
        <p className="mb-2 text-xs text-amber-800 dark:text-amber-200/90">{workMessage}</p>
      )}
      <ul className="space-y-3">
        {displayItems.map((item) => {
          const m = metricsFor(item);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
              {item.assignedHours != null && (
                <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200/90">
                  Assigned hours: {item.assignedHours}
                </p>
              )}
              {item.description && (
                <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Hours logged</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {m?.hoursLogged != null ? m.hoursLogged : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Production</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {m?.productionUnits != null ? m.productionUnits : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Quality</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {m?.qualityScore != null ? `${m.qualityScore}%` : "—"}
                  </p>
                </div>
              </div>
              {m?.lastActivityAt && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">
                  Last updated: {formatDisplayDateTime(m.lastActivityAt)}
                </p>
              )}
              {!m && !workLoading && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">
                  No work metrics recorded for this day yet.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TickList({
  items,
  onToggle,
  busyId,
  readOnly,
}: {
  items: DayChecklistItem[];
  onToggle: (itemId: string, completed: boolean) => void;
  busyId: string | null;
  readOnly?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          {readOnly ? (
            <div className={`flex items-start gap-3 ${itemRow}`}>
              {item.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <div>
                <p
                  className={`font-medium ${item.completed ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}
                >
                  {item.title}
                </p>
                {item.assignedHours != null && (
                  <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200/90">
                    Assigned hours: {item.assignedHours}
                  </p>
                )}
                {item.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => onToggle(item.id, !item.completed)}
              className={`flex w-full items-start gap-3 text-left transition hover:border-slate-300 disabled:opacity-60 dark:hover:border-slate-600 ${itemRow}`}
            >
              {item.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <div>
                <p
                  className={`font-medium ${item.completed ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}
                >
                  {item.title}
                </p>
                {item.assignedHours != null && (
                  <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200/90">
                    Assigned hours: {item.assignedHours}
                  </p>
                )}
                {item.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                )}
              </div>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function TodayLessons({ day, readOnly }: { day: DaySnapshot; readOnly?: boolean }) {
  if (day.lessons.length === 0) return null;

  return (
    <ul className="space-y-3">
      {day.lessons.map((lesson) => {
        const href = `/trainee/courses/${lesson.courseId}/player?lesson=${lesson.lessonId}`;
        return (
          <li
            key={lesson.linkId}
            className={`flex items-center justify-between gap-3 ${itemRow}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {lesson.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">{lesson.label || lesson.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {lesson.courseTitle} · {lesson.moduleTitle}
                  {lesson.watchPercent > 0 && !lesson.completed
                    ? ` · ${lesson.watchPercent}%`
                    : ""}
                </p>
              </div>
            </div>
            {!readOnly || lesson.completed ? (
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                {lesson.completed ? "Review" : "Start"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="text-xs text-slate-500">Locked</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DayContent({
  day,
  readOnly,
  onToggle,
  busyId,
  workByProject,
  workLoading,
  workMessage,
}: {
  day: DaySnapshot;
  readOnly?: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
  busyId: string | null;
  workByProject: DayWorkMetrics[];
  workLoading: boolean;
  workMessage?: string;
}) {
  const workItems = day.workItems || [];
  const hasDayWorkMetrics = workByProject.some(
    (p) => p.dayNumber === day.dayNumber || p.projectId === `day-${day.dayNumber}`
  );
  const hasAnything =
    day.checklist.length > 0 ||
    day.lessons.length > 0 ||
    workItems.length > 0 ||
    hasDayWorkMetrics;

  if (!hasAnything) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        No work on this day yet. Your Team Lead will add checklist items, courses, or training
        work.
      </p>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-6">
        {(day.checklist.length > 0 || day.lessons.length > 0) && (
          <DayItemsSummary day={{ ...day, workItems: [] }} />
        )}
        {workItems.length > 0 && (
          <TrainingWorkPanel
            day={day}
            workByProject={workByProject}
            workLoading={workLoading}
            workMessage={workMessage}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {day.checklist.length > 0 && (
        <section>
          <h3 className={`mb-2 flex items-center gap-2 ${sectionLabel}`}>
            <ClipboardList className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            Checklist
          </h3>
          <TickList items={day.checklist} onToggle={onToggle} busyId={busyId} />
        </section>
      )}
      {day.lessons.length > 0 && (
        <section>
          <h3 className={`mb-2 flex items-center gap-2 ${sectionLabel}`}>
            <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Courses / videos
          </h3>
          <TodayLessons day={day} />
        </section>
      )}
      {workItems.length > 0 && (
        <TrainingWorkPanel
          day={day}
          workByProject={workByProject}
          workLoading={workLoading}
          workMessage={workMessage}
        />
      )}
    </div>
  );
}

export function TrainingDayClient({ plan: initial }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [viewDayNumber, setViewDayNumber] = useState<number | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const [workByProject, setWorkByProject] = useState<DayWorkMetrics[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workMessage, setWorkMessage] = useState("");

  useEffect(() => {
    void (async () => {
      setWorkLoading(true);
      try {
        const res = await fetch("/api/trainee-work");
        const data = await res.json();
        if (res.ok) {
          setWorkByProject(data.projects || []);
          setWorkMessage(data.message || "");
        } else {
          setWorkByProject([]);
          setWorkMessage(data.error || "Could not load work metrics");
        }
      } catch {
        setWorkByProject([]);
        setWorkMessage("Could not load work metrics");
      } finally {
        setWorkLoading(false);
      }
    })();
  }, []);

  const today = plan.today;
  const pastDays = plan.pastDays ?? [];

  const daysWithFeedback = useMemo(() => {
    const list: DaySnapshot[] = [];
    if (today?.review && (today.review.notes || today.review.rating != null)) {
      list.push(today);
    }
    for (const d of pastDays) {
      if (d.review && (d.review.notes || d.review.rating != null)) {
        list.push(d);
      }
    }
    return list.sort((a, b) => b.dayNumber - a.dayNumber);
  }, [today, pastDays]);

  const viewing = useMemo(() => {
    if (viewDayNumber == null || !today) return today;
    if (viewDayNumber === today.dayNumber) return today;
    return pastDays.find((d) => d.dayNumber === viewDayNumber) ?? today;
  }, [viewDayNumber, today, pastDays]);

  const isViewingOtherDay =
    Boolean(today && viewing && viewing.dayNumber !== today.dayNumber);
  // Open days (≤ current) stay editable until done; completed past days are review-only.
  // Admin can open later days early — trainee may finish open days in any order.
  const canEditViewing =
    Boolean(viewing) &&
    viewing!.dayNumber <= plan.currentDay &&
    (viewing!.dayNumber === plan.currentDay || !viewing!.done);
  const readOnly = !canEditViewing;

  async function toggleChecklist(itemId: string, completed: boolean) {
    setBusyId(itemId);
    setMsg("");
    const res = await fetch("/api/curriculum/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, completed }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMsg(data.error || "Could not update checklist");
      return;
    }
    if (data.plan) {
      setPlan(data.plan);
      setViewDayNumber(null);
    }
    // Force immediate refresh to update progress bars
    await router.refresh();
  }

  if (plan.source === "empty" || !today || !viewing) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your day plan</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          No day-wise curriculum has been set up yet. Ask Admin or your Team Lead to create Day 1
          checklist and training days.
        </p>
        <Link href="/onboarding" className="mt-6 inline-block text-sm text-blue-400 hover:underline">
          Open welcome guide
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Today&apos;s work
          </h1>
          <ProgressBandBadge
            overallPercent={plan.overallPercent}
            currentDay={plan.currentDay}
            totalDays={plan.totalDays}
            showPace
          />
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Day {today.dayNumber} of {plan.totalDays}
          {today.projectName ? ` · ${today.projectName}` : ""}
          {plan.trainingStart ? ` · Started ${formatDisplayDate(plan.trainingStart)}` : ""}
        </p>
        {(plan.dueSummary.overdueCount > 0 ||
          plan.dueSummary.dueTodayCount > 0 ||
          plan.dueSummary.doneLateCount > 0) && (
          <p className="mt-2 text-sm">
            {plan.dueSummary.overdueCount > 0 && (
              <span className="font-medium text-red-800 dark:text-red-300">
                {plan.dueSummary.overdueCount} overdue
              </span>
            )}
            {plan.dueSummary.dueTodayCount > 0 && (
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {plan.dueSummary.overdueCount > 0 ? " · " : ""}
                {plan.dueSummary.dueTodayCount} due today
              </span>
            )}
            {plan.dueSummary.doneLateCount > 0 && (
              <span className="font-medium text-orange-900 dark:text-orange-200">
                {(plan.dueSummary.overdueCount > 0 ||
                  plan.dueSummary.dueTodayCount > 0) &&
                  " · "}
                {formatFinishedLateLabel(plan.dueSummary.doneLateCount)}
              </span>
            )}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={statCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-500">
              Today
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {today.percent}%
            </p>
            <ProgressBar percent={today.percent} />
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
              {today.completedCount}/{today.totalCount} items
            </p>
          </div>
          <div className={statCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-500">
              Training overall
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {plan.overallPercent}%
            </p>
            <ProgressBar percent={plan.overallPercent} />
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
              Across {plan.totalDays} day{plan.totalDays === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {!isViewingOtherDay && daysWithFeedback.length > 0 && (
        <div className={`${panelCard} border-blue-200 dark:border-blue-800/40`}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            <MessageSquare className="h-4 w-4" />
            Team Lead feedback
          </h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Reviews from your lead for completed days — visible here without opening past days.
          </p>
          <ul className="space-y-3">
            {daysWithFeedback.map((d) => (
              <li key={d.dayNumber}>
                <LeadReviewCard day={d} compact />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {plan.allDays.map((d) => {
          const isCurrent = d.dayNumber === plan.currentDay;
          const isOpen = d.dayNumber <= plan.currentDay;
          const selected =
            (viewDayNumber ?? today.dayNumber) === d.dayNumber;
          const clickable = isOpen;
          const due = d.due;
          return (
            <button
              key={d.dayNumber}
              type="button"
              disabled={!clickable}
              title={`${d.title}${d.projectName ? ` — ${d.projectName}` : ""}${
                due?.label ? ` · ${due.label}` : ""
              }`}
              onClick={() => setViewDayNumber(isCurrent ? null : d.dayNumber)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : d.done
                    ? due?.status === "DONE_LATE"
                      ? "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-transparent dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-transparent dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    : due?.status === "OVERDUE"
                      ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-transparent dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/70"
                      : isOpen
                        ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-transparent dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                        : "cursor-default border-slate-200 bg-slate-100 text-slate-500 dark:border-transparent dark:bg-slate-800 dark:text-slate-500"
              }`}
            >
              <span className="block">D{d.dayNumber}</span>
              {due?.label && isOpen && (
                <span
                  className={`mt-0.5 block text-[10px] leading-tight ${
                    selected ? "text-blue-100" : dueBadgeClass(due.status)
                  }`}
                >
                  {due.status === "OVERDUE"
                    ? `${due.daysLate}d late`
                    : due.status === "DONE_LATE"
                      ? `${due.daysLate}d late`
                      : due.status === "DUE_TODAY"
                        ? "Due"
                        : due.status === "DONE_ON_TIME"
                          ? "Done"
                          : due.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isViewingOtherDay && (
        <div className={`flex flex-wrap items-center justify-between gap-2 text-sm ${itemRow}`}>
          <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {readOnly
              ? `Reviewing Day ${viewing.dayNumber} (read-only)`
              : `Catching up Day ${viewing.dayNumber}${
                  viewing.due?.status === "OVERDUE"
                    ? ` · ${viewing.due.label}`
                    : ""
                }`}
          </span>
          <button
            type="button"
            onClick={() => setViewDayNumber(null)}
            className="font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            Back to today
          </button>
        </div>
      )}

      {!isViewingOtherDay && pastDays.length > 0 && (
        <div className={panelCard}>
          <h3 className={`mb-2 flex items-center gap-2 ${sectionLabel}`}>
            <History className="h-4 w-4" />
            Previous days
          </h3>
          <div className={`${itemRow} dark:bg-slate-950/40`}>
            <p className="font-medium text-slate-900 dark:text-slate-200">
              Yesterday — Day {pastDays[0].dayNumber}: {pastDays[0].title}
              {pastDays[0].projectName ? ` · ${pastDays[0].projectName}` : ""}
            </p>
            <DayItemsSummary day={pastDays[0]} />
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">
              {pastDays[0].completedCount}/{pastDays[0].totalCount} done · {pastDays[0].percent}%
              {pastDays[0].due?.label ? ` · ${pastDays[0].due.label}` : ""}
              {pastDays[0].review ? " · Lead feedback available" : ""}
            </p>
            <button
              type="button"
              onClick={() => setViewDayNumber(pastDays[0].dayNumber)}
              className="mt-3 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              {pastDays[0].done ? "Open day review" : "Continue this day"}
            </button>
          </div>

          {pastDays.length > 1 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAllPast((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronDown
                  className={`h-4 w-4 transition ${showAllPast ? "rotate-180" : ""}`}
                />
                {showAllPast ? "Hide" : "Show"} all previous days ({pastDays.length})
              </button>
              {showAllPast && (
                <ul className="mt-3 space-y-3">
                  {pastDays.slice(1).map((day) => (
                    <li
                      key={day.dayNumber}
                      className={`${itemRow} p-3 dark:bg-slate-950/30`}
                    >
                      <button
                        type="button"
                        onClick={() => setViewDayNumber(day.dayNumber)}
                        className="w-full text-left"
                      >
                        <p className="font-medium text-slate-900 dark:text-slate-200">
                          Day {day.dayNumber}: {day.title}
                          {day.projectName ? ` · ${day.projectName}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {day.completedCount}/{day.totalCount} · {day.percent}%
                          {day.due?.label ? ` · ${day.due.label}` : ""}
                          {day.review ? " · Lead feedback" : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${panelCard} p-6`}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{viewing.title}</h2>
          {viewing.done ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                viewing.due?.status === "DONE_LATE"
                  ? dueToneClass("DONE_LATE")
                  : dueToneClass("DONE_ON_TIME")
              }`}
            >
              {viewing.due?.status === "DONE_LATE"
                ? viewing.due.label
                : "Done"}
            </span>
          ) : (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                viewing.due?.status === "OVERDUE"
                  ? dueToneClass("OVERDUE")
                  : viewing.due?.status === "DUE_TODAY"
                    ? dueToneClass("DUE_TODAY")
                    : dueToneClass("UPCOMING")
              }`}
            >
              {viewing.due?.status === "OVERDUE" ||
              viewing.due?.status === "DUE_TODAY"
                ? viewing.due.label
                : `${viewing.completedCount}/${viewing.totalCount}`}
            </span>
          )}
        </div>
        {viewing.description && (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{viewing.description}</p>
        )}
        {viewing.due?.dueDate && (
          <p className="mb-3 text-xs text-slate-500">
            Due {formatDisplayDate(viewing.due.dueDate)}
            {viewing.completedAt
              ? ` · Completed ${formatDisplayDateTime(viewing.completedAt)}`
              : ""}
          </p>
        )}
        <div className="mb-4 space-y-1">
          <ProgressBar percent={viewing.percent} />
          <p className="text-xs text-slate-500">
            {isViewingOtherDay ? `Day ${viewing.dayNumber}` : "Today"}:{" "}
            {viewing.percent}%
            {readOnly ? "" : " · editable"}
          </p>
        </div>

        <DayContent
          day={viewing}
          readOnly={readOnly}
          onToggle={toggleChecklist}
          busyId={busyId}
          workByProject={workByProject}
          workLoading={workLoading}
          workMessage={workMessage}
        />

        <LeadReviewCard day={viewing} />

        {msg && <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">{msg}</p>}
      </div>

      <FinalExamGateCard />

      {plan.readyForProduction && <TrackerProgressPanel />}

      {plan.trainingStatus === "AWAITING_EVALUATION" && !plan.readyForProduction && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
          Training days are finished. Open the Final Quiz when you are ready — one attempt. Your
          score is one part of how Admin reviews overall performance.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/trainee/progress"
          className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          View full progress
        </Link>
        <Link
          href="/trainee/courses"
          className="inline-flex items-center gap-2 font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          <BookOpen className="h-4 w-4" />
          Review past lessons
        </Link>
      </div>
    </div>
  );
}
