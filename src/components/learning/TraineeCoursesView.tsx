"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  HelpCircle,
  Lock,
  Play,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { cn } from "@/lib/utils";
import type { LibraryCourse, LibraryLesson } from "@/lib/course-library";

const libraryFadePanel =
  "relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent bg-slate-900/50";

const panelCard =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500";

function lessonStatus(lesson: LibraryLesson) {
  if (lesson.access === "locked") return { label: "Locked", tone: "locked" as const };
  if (lesson.completed || lesson.access === "completed") {
    return { label: "Done", tone: "done" as const };
  }
  if (lesson.quizCount > 0 && !lesson.quizPassed && lesson.watchPercent >= 90) {
    return { label: "Quiz left", tone: "quiz" as const };
  }
  if (lesson.watchPercent > 0) {
    return { label: `${Math.round(lesson.watchPercent)}%`, tone: "progress" as const };
  }
  return { label: "Open", tone: "idle" as const };
}

export function TraineeCoursesView({
  courses,
  mode = "enrollment",
  currentDay = 1,
}: {
  courses: LibraryCourse[];
  mode?: "curriculum" | "enrollment" | "empty";
  currentDay?: number;
}) {
  const completedCount = courses.filter((c) => c.progressPercent >= 100).length;
  const inProgressCount = courses.filter(
    (c) => c.progressPercent > 0 && c.progressPercent < 100
  ).length;
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const firstActive = courses.find((c) => c.progressPercent < 100);
    return new Set(firstActive ? [firstActive.enrollmentId] : []);
  });

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 pb-4">
        <Header
          mode={mode}
          completedCount={0}
          inProgressCount={0}
          total={0}
          currentDay={currentDay}
        />
        <div
          className={`flex flex-col items-center px-6 py-16 text-center ${panelCard}`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <BookOpen className="h-7 w-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Nothing to review yet
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            {mode === "empty" || mode === "curriculum"
              ? "Lessons appear here once your Team Lead adds them to the day-wise plan. Start with Today’s Work."
              : "No courses assigned yet. Check Today’s Work for your daily plan."}
          </p>
          <Link
            href="/trainee/training"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            <ClipboardCheck className="h-4 w-4" />
            Go to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <Header
        mode={mode}
        completedCount={completedCount}
        inProgressCount={inProgressCount}
        total={courses.length}
        currentDay={currentDay}
      />

      <div className="grid gap-5">
        {courses.map((course) => {
          const open = openIds.has(course.enrollmentId);
          const isComplete = course.progressPercent >= 100;
          const openable =
            course.resumeLessonId &&
            course.modules
              .flatMap((m) => m.lessons)
              .find((l) => l.id === course.resumeLessonId)?.access !== "locked";
          const ctaHref = openable
            ? `/trainee/courses/${course.courseId}/player?lesson=${course.resumeLessonId}`
            : null;

          return (
            <article
              key={course.enrollmentId}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition",
                isComplete
                  ? "border-emerald-200 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-slate-900/50 dark:shadow-none"
                  : "border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 dark:shadow-none",
                "hover:border-slate-300 dark:hover:border-slate-500/60"
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  isComplete ? "bg-emerald-500" : "bg-blue-600"
                )}
              />

              <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-center sm:gap-6">
                <ProgressRing
                  percent={course.progressPercent}
                  size={72}
                  strokeWidth={6}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                      {course.title}
                    </h2>
                    <StatusPill status={course.status} percent={course.progressPercent} />
                  </div>
                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-500">
                    <span>
                      {course.completedLessons}/{course.totalLessons} lessons
                    </span>
                    <span>{course.totalModules} modules</span>
                    <span>{Math.round(course.progressPercent)}% complete</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-stretch sm:flex-col sm:items-end sm:justify-center">
                  {ctaHref ? (
                    <Link
                      href={ctaHref}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        isComplete
                          ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                          : btnPrimary
                      )}
                    >
                      {isComplete ? (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Review
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Open
                        </>
                      )}
                    </Link>
                  ) : (
                    <Link
                      href="/trainee/training"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Lock className="h-4 w-4" />
                      See today&apos;s plan
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(course.enrollmentId)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                    aria-expanded={open}
                  >
                    {open ? "Hide outline" : "Show outline"}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
                    />
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 pl-6 dark:border-slate-700/60 dark:bg-slate-950/30">
                  <div className="space-y-5">
                    {course.modules.map((mod) => {
                      const done = mod.lessons.filter((l) => l.completed).length;
                      const pct =
                        mod.lessons.length > 0 ? (done / mod.lessons.length) * 100 : 0;

                      return (
                        <div key={mod.id}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200">
                              {mod.title}
                            </h3>
                            <span className="text-[11px] tabular-nums text-slate-500">
                              {done}/{mod.lessons.length}
                            </span>
                          </div>
                          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct >= 100
                                  ? "bg-emerald-500"
                                  : "bg-gradient-to-r from-blue-600 to-cyan-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800/80 dark:border-slate-800/80 dark:bg-slate-900/40">
                            {mod.lessons.map((lesson, idx) => {
                              const status = lessonStatus(lesson);
                              const locked = lesson.access === "locked";
                              const rowClass =
                                "flex items-center gap-3 px-3 py-2.5 transition";
                              const inner = (
                                <>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {idx + 1}
                                  </span>
                                  {locked ? (
                                    <Lock className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
                                  ) : lesson.completed ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Circle className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
                                  )}
                                  <span
                                    className={cn(
                                      "min-w-0 flex-1 truncate text-sm",
                                      locked
                                        ? "text-slate-500"
                                        : "text-slate-800 dark:text-slate-200"
                                    )}
                                  >
                                    {lesson.title}
                                    {lesson.dayNumber != null && (
                                      <span className="ml-2 text-[10px] text-slate-500">
                                        Day {lesson.dayNumber}
                                      </span>
                                    )}
                                  </span>
                                  {lesson.quizCount > 0 && !locked && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
                                      <HelpCircle className="h-3 w-3" />
                                      {lesson.quizCount > 1
                                        ? `${lesson.quizCount} quizzes`
                                        : "Quiz"}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                                      status.tone === "done" &&
                                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                                      status.tone === "quiz" &&
                                        "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
                                      status.tone === "progress" &&
                                        "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
                                      status.tone === "idle" &&
                                        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                      status.tone === "locked" &&
                                        "bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-500"
                                    )}
                                  >
                                    {status.label}
                                  </span>
                                </>
                              );

                              return (
                                <li key={lesson.id}>
                                  {locked ? (
                                    <div className={cn(rowClass, "cursor-not-allowed opacity-70")}>
                                      {inner}
                                    </div>
                                  ) : (
                                    <Link
                                      href={`/trainee/courses/${course.courseId}/player?lesson=${lesson.id}`}
                                      className={cn(
                                        rowClass,
                                        "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                      )}
                                    >
                                      {inner}
                                    </Link>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Header({
  mode,
  completedCount,
  inProgressCount,
  total,
  currentDay,
}: {
  mode: "curriculum" | "enrollment" | "empty";
  completedCount: number;
  inProgressCount: number;
  total: number;
  currentDay: number;
}) {
  return (
    <div className={cn(libraryFadePanel, "px-6 py-7")}>
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl dark:bg-blue-500/10" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800 dark:text-blue-300/90">
          Review
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Course library
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-700 dark:text-slate-400">
          {mode === "curriculum"
            ? `Revisit lessons you’ve unlocked. Future days stay locked until you reach them (you’re on Day ${currentDay}). Daily work lives in Today’s Work.`
            : "Revisit lessons anytime. Your day-by-day plan is in Today’s Work."}
        </p>
        <Link
          href="/trainee/training"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          <ClipboardCheck className="h-4 w-4" />
          Go to Today&apos;s Work
        </Link>
        {total > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <StatChip label="Courses" value={String(total)} />
            <StatChip label="In progress" value={String(inProgressCount)} accent="blue" />
            <StatChip label="Completed" value={String(completedCount)} accent="emerald" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "blue" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        accent === "blue" &&
          "border-blue-200 bg-blue-50 dark:border-blue-500/25 dark:bg-blue-500/10",
        accent === "emerald" &&
          "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
        !accent && "border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/60"
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-500">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function StatusPill({ status, percent }: { status: string; percent: number }) {
  const done = percent >= 100 || status === "COMPLETED";
  const active = !done && (percent > 0 || status === "IN_PROGRESS");
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        done &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
        active && "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
        !done && !active && "bg-slate-100 text-slate-600 dark:bg-slate-700/80 dark:text-slate-400"
      )}
    >
      {done ? "Completed" : active ? "In progress" : "Not started"}
    </span>
  );
}
