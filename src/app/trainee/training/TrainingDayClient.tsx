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
import { TrackerProgressPanel } from "@/components/tracker/TrackerProgressPanel";
import { FinalExamGateCard } from "@/components/trainee/FinalEvaluationExam";

type Props = {
  plan: DayWisePlan;
};

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
          ? "rounded-xl border border-blue-800/40 bg-blue-950/25 p-3"
          : "mt-5 rounded-xl border border-blue-800/50 bg-blue-950/30 p-4"
      }
    >
      <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-200">
        <MessageSquare className="h-4 w-4 shrink-0" />
        {compact ? (
          <>
            Day {day.dayNumber}: {day.title}
          </>
        ) : (
          <>Feedback from your Team Lead</>
        )}
        {review.reviewerName ? (
          <span className="font-normal text-slate-400">· {review.reviewerName}</span>
        ) : null}
      </h3>
      {review.rating != null && (
        <p className="mb-2 inline-flex items-center gap-1 text-sm text-amber-200">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {review.rating}/5
        </p>
      )}
      {review.notes && (
        <p className="whitespace-pre-wrap text-sm text-slate-200">{review.notes}</p>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
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
        <li key={item.key} className="flex items-start gap-2 text-sm text-slate-300">
          {item.done === null ? (
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          ) : item.done ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
          )}
          <span className={item.done ? "text-slate-400" : ""}>
            <span className="mr-1.5 text-[10px] uppercase text-slate-500">{item.tag}</span>
            {item.title}
            {item.hours != null ? (
              <span className="ml-1 text-xs text-amber-200/80">({item.hours}h assigned)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

type HrmsProjectWork = {
  projectId: string;
  projectName: string;
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
  workByProject: HrmsProjectWork[];
  workLoading: boolean;
  workMessage?: string;
}) {
  const items = day.workItems || [];
  if (items.length === 0) return null;

  function metricsFor(item: DayChecklistItem): HrmsProjectWork | null {
    const byId = day.hrmsProjectId
      ? workByProject.find((p) => p.projectId === day.hrmsProjectId)
      : null;
    if (byId) return byId;
    const name = (item.title || day.projectName || "").trim().toLowerCase();
    if (!name) return null;
    return (
      workByProject.find((p) => p.projectName.trim().toLowerCase() === name) ||
      workByProject.find((p) => p.projectName.toLowerCase().includes(name)) ||
      null
    );
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Briefcase className="h-3.5 w-3.5 text-amber-400" />
        Training work
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Progress comes from HRMS tracker (hours / production). No tick needed — incomplete work
        does not block the next day.
      </p>
      {workLoading && <p className="mb-2 text-xs text-slate-500">Loading tracker data…</p>}
      {workMessage && !workLoading && (
        <p className="mb-2 text-xs text-amber-200/90">{workMessage}</p>
      )}
      <ul className="space-y-3">
        {items.map((item) => {
          const m = metricsFor(item);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3"
            >
              <p className="font-medium text-slate-100">{item.title}</p>
              {item.assignedHours != null && (
                <p className="mt-0.5 text-sm text-amber-200/90">
                  Assigned hours: {item.assignedHours}
                </p>
              )}
              {item.description && (
                <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Hours logged</p>
                  <p className="text-lg font-semibold text-white">
                    {m?.hoursLogged != null ? m.hoursLogged : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Production</p>
                  <p className="text-lg font-semibold text-white">
                    {m?.productionUnits != null ? m.productionUnits : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Quality</p>
                  <p className="text-lg font-semibold text-white">
                    {m?.qualityScore != null ? `${m.qualityScore}%` : "—"}
                  </p>
                </div>
              </div>
              {m?.lastActivityAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Last activity: {new Date(m.lastActivityAt).toLocaleString()}
                </p>
              )}
              {m?.message && (
                <p className="mt-1 text-xs text-slate-500">{m.message}</p>
              )}
              {!m && !workLoading && (
                <p className="mt-2 text-xs text-slate-500">
                  No HRMS tracker data linked for this project yet.
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
            <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
              {item.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              )}
              <div>
                <p
                  className={`font-medium ${item.completed ? "text-slate-400 line-through" : "text-slate-100"}`}
                >
                  {item.title}
                </p>
                {item.assignedHours != null && (
                  <p className="mt-0.5 text-sm text-amber-200/90">
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
              className="flex w-full items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-left transition hover:border-slate-600 disabled:opacity-60"
            >
              {item.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              )}
              <div>
                <p
                  className={`font-medium ${item.completed ? "text-slate-400 line-through" : "text-slate-100"}`}
                >
                  {item.title}
                </p>
                {item.assignedHours != null && (
                  <p className="mt-0.5 text-sm text-amber-200/90">
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
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              {lesson.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-slate-100">{lesson.label || lesson.title}</p>
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
                className="inline-flex shrink-0 items-center gap-1 text-sm text-blue-400 hover:underline"
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
  workByProject: HrmsProjectWork[];
  workLoading: boolean;
  workMessage?: string;
}) {
  const workItems = day.workItems || [];
  const hasAnything =
    day.checklist.length > 0 || day.lessons.length > 0 || workItems.length > 0;

  if (!hasAnything) {
    return (
      <p className="text-sm text-slate-400">
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
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ClipboardList className="h-3.5 w-3.5 text-sky-400" />
            Checklist
          </h3>
          <TickList items={day.checklist} onToggle={onToggle} busyId={busyId} />
        </section>
      )}
      {day.lessons.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-blue-400" />
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
  const [workByProject, setWorkByProject] = useState<HrmsProjectWork[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workMessage, setWorkMessage] = useState("");

  useEffect(() => {
    void (async () => {
      setWorkLoading(true);
      try {
        const res = await fetch("/api/hrms/work");
        const data = await res.json();
        if (res.ok) {
          setWorkByProject(data.projects || []);
          setWorkMessage(data.message || "");
        } else {
          setWorkByProject([]);
          setWorkMessage(data.error || "Could not load HRMS work");
        }
      } catch {
        setWorkByProject([]);
        setWorkMessage("Could not load HRMS work");
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

  const isReviewingPast =
    Boolean(today && viewing && viewing.dayNumber !== today.dayNumber);

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
    router.refresh();
  }

  if (plan.source === "empty" || !today || !viewing) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <h2 className="text-xl font-bold">Your day plan</h2>
        <p className="mt-2 text-slate-400">
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Today&apos;s work</h1>
        <p className="mt-1 text-slate-400">
          Day {today.dayNumber} of {plan.totalDays}
          {today.projectName ? ` · ${today.projectName}` : ""}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{today.percent}%</p>
            <ProgressBar percent={today.percent} />
            <p className="mt-1 text-xs text-slate-500">
              {today.completedCount}/{today.totalCount} items
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Training overall</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {plan.overallPercent}%
            </p>
            <ProgressBar percent={plan.overallPercent} />
            <p className="mt-1 text-xs text-slate-500">
              Across {plan.totalDays} day{plan.totalDays === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {!isReviewingPast && daysWithFeedback.length > 0 && (
        <div className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-200">
            <MessageSquare className="h-4 w-4" />
            Team Lead feedback
          </h3>
          <p className="mb-4 text-sm text-slate-400">
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
          const isPast = d.dayNumber < plan.currentDay;
          const selected =
            (viewDayNumber ?? today.dayNumber) === d.dayNumber;
          const clickable = isCurrent || isPast;
          return (
            <button
              key={d.dayNumber}
              type="button"
              disabled={!clickable}
              title={`${d.title}${d.projectName ? ` — ${d.projectName}` : ""}`}
              onClick={() => setViewDayNumber(isCurrent ? null : d.dayNumber)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm transition ${
                selected
                  ? "bg-blue-600 text-white"
                  : d.done
                    ? "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
                    : isPast
                      ? "bg-amber-900/30 text-amber-200 hover:bg-amber-900/50"
                      : "cursor-default bg-slate-800 text-slate-500"
              }`}
            >
              D{d.dayNumber}
            </button>
          );
        })}
      </div>

      {isReviewingPast && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-300">
            <Eye className="h-4 w-4 text-slate-400" />
            Reviewing Day {viewing.dayNumber} (read-only)
          </span>
          <button
            type="button"
            onClick={() => setViewDayNumber(null)}
            className="text-blue-400 hover:underline"
          >
            Back to today
          </button>
        </div>
      )}

      {!isReviewingPast && pastDays.length > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <History className="h-4 w-4" />
            Previous days
          </h3>
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
            <p className="font-medium text-slate-200">
              Yesterday — Day {pastDays[0].dayNumber}: {pastDays[0].title}
              {pastDays[0].projectName ? ` · ${pastDays[0].projectName}` : ""}
            </p>
            <DayItemsSummary day={pastDays[0]} />
            <p className="mt-2 text-xs text-slate-500">
              {pastDays[0].completedCount}/{pastDays[0].totalCount} done · {pastDays[0].percent}%
              {pastDays[0].review ? " · Lead feedback available" : ""}
            </p>
            <button
              type="button"
              onClick={() => setViewDayNumber(pastDays[0].dayNumber)}
              className="mt-3 text-sm text-blue-400 hover:underline"
            >
              Open day review
            </button>
          </div>

          {pastDays.length > 1 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAllPast((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
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
                      className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => setViewDayNumber(day.dayNumber)}
                        className="w-full text-left"
                      >
                        <p className="font-medium text-slate-200">
                          Day {day.dayNumber}: {day.title}
                          {day.projectName ? ` · ${day.projectName}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {day.completedCount}/{day.totalCount} · {day.percent}%
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

      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">{viewing.title}</h2>
          {viewing.done ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              Done
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              {viewing.completedCount}/{viewing.totalCount}
            </span>
          )}
        </div>
        {viewing.description && (
          <p className="mb-4 text-sm text-slate-400">{viewing.description}</p>
        )}
        <div className="mb-4 space-y-1">
          <ProgressBar percent={viewing.percent} />
          <p className="text-xs text-slate-500">
            {isReviewingPast ? `Day ${viewing.dayNumber}` : "Today"}: {viewing.percent}%
          </p>
        </div>

        <DayContent
          day={viewing}
          readOnly={isReviewingPast}
          onToggle={toggleChecklist}
          busyId={busyId}
          workByProject={workByProject}
          workLoading={workLoading}
          workMessage={workMessage}
        />

        <LeadReviewCard day={viewing} />

        {msg && <p className="mt-4 text-sm text-amber-300">{msg}</p>}
      </div>

      <FinalExamGateCard />

      {plan.readyForProduction && <TrackerProgressPanel />}

      {plan.trainingStatus === "AWAITING_EVALUATION" && !plan.readyForProduction && (
        <p className="rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Training days are finished. Open the Final Quiz when you are ready — one attempt. Your
          score is one part of how Admin reviews overall performance.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/trainee/progress"
          className="text-slate-400 hover:text-slate-200 hover:underline"
        >
          View full progress
        </Link>
        <Link
          href="/trainee/courses"
          className="inline-flex items-center gap-2 text-blue-400 hover:underline"
        >
          <BookOpen className="h-4 w-4" />
          Review past lessons
        </Link>
      </div>
    </div>
  );
}
