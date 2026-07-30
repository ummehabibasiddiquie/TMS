"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  Target,
  Flame,
  BookOpen,
  Clock,
  ChevronDown,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDisplayDate } from "@/lib/format-date";
import { TrackerProgressPanel } from "@/components/tracker/TrackerProgressPanel";
import { ProgressBandBadge } from "@/components/learning/ProgressBandBadge";
import { resolveProgressBand, formatFinishedLateLabel } from "@/lib/progress-band";
import { dueBadgeClass } from "@/lib/day-due";

/** Outer onboarding panel — keep original band fade only on this wrapper. */
const onboardingFadePanel = (soft: string) =>
  `rounded-2xl border border-slate-700 bg-gradient-to-br ${soft} bg-slate-900/50 p-6`;

const panelCard =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none";

const statCard =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/40 dark:shadow-none";

const itemRow =
  "rounded-xl border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-950/40";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 dark:shadow-blue-950/25";

const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

export default function TraineeProgressPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/trainee/progress");
        const result = await res.json();
        if (res.ok) setData(result);
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleCourse(courseId: string) {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  if (loading) return <PageLoader message="Loading progress..." />;

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Failed to load progress data.</p>
      </div>
    );
  }

  const { dayWise, overall, courseProgress, recentActivity, achievements } = data;
  const band = resolveProgressBand({
    overallPercent: dayWise?.overallPercent ?? 0,
    currentDay: dayWise?.currentDay ?? 0,
    totalDays: dayWise?.totalDays ?? 0,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Progress</h1>
          <ProgressBandBadge
            overallPercent={dayWise?.overallPercent ?? 0}
            currentDay={dayWise?.currentDay ?? 0}
            totalDays={dayWise?.totalDays ?? 0}
            showPace
          />
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{band.description}</p>
      </div>

      <TrackerProgressPanel />

      <div className={onboardingFadePanel(band.soft)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`${sectionLabel} text-blue-800 dark:text-blue-300`}>
              Onboarding & training
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              {dayWise?.todayTitle || `Day ${dayWise?.currentDay ?? "—"}`}
            </h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
              Day {dayWise?.currentDay ?? 0} of {dayWise?.totalDays ?? 0}
              {dayWise?.todayDone ? " · Today complete" : ""}
              {dayWise?.trainingStart
                ? ` · Started ${formatDisplayDate(dayWise.trainingStart)}`
                : ""}
            </p>
            {(dayWise?.dueSummary?.overdueCount > 0 ||
              dayWise?.dueSummary?.dueTodayCount > 0 ||
              dayWise?.dueSummary?.doneLateCount > 0) && (
              <p className="mt-2 text-sm">
                {dayWise.dueSummary.overdueCount > 0 && (
                  <span className="font-medium text-red-800 dark:text-red-300">
                    {dayWise.dueSummary.overdueCount} overdue
                  </span>
                )}
                {dayWise.dueSummary.dueTodayCount > 0 && (
                  <span className="font-medium text-amber-900 dark:text-amber-200">
                    {dayWise.dueSummary.overdueCount > 0 ? " · " : ""}
                    {dayWise.dueSummary.dueTodayCount} due today
                  </span>
                )}
                {dayWise.dueSummary.doneLateCount > 0 && (
                  <span className="font-medium text-orange-900 dark:text-orange-200">
                    {(dayWise.dueSummary.overdueCount > 0 ||
                      dayWise.dueSummary.dueTodayCount > 0) &&
                      " · "}
                    {formatFinishedLateLabel(dayWise.dueSummary.doneLateCount)}
                  </span>
                )}
              </p>
            )}
          </div>
          <Link href="/trainee/training" className={btnPrimary}>
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Today&apos;s Work
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className={`flex items-center gap-4 ${statCard}`}>
            <ProgressRing
              percent={dayWise?.todayPercent ?? 0}
              size={72}
              strokeWidth={6}
              color={band.ring}
            />
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                Today
              </p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {Math.round(dayWise?.todayPercent ?? 0)}%
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-500">
                {dayWise?.todayCompleted ?? 0}/{dayWise?.todayTotal ?? 0} items
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-4 ${statCard}`}>
            <ProgressRing
              percent={dayWise?.overallPercent ?? 0}
              size={72}
              strokeWidth={6}
              color={band.ring}
            />
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                Overall onboarding
              </p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {Math.round(dayWise?.overallPercent ?? 0)}%
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-500">{band.label} level</p>
            </div>
          </div>
        </div>

        {dayWise?.days?.length > 0 && (
          <ul className="mt-6 space-y-2">
            {dayWise.days.map(
              (d: {
                dayNumber: number;
                title: string;
                projectName: string | null;
                percent: number;
                done: boolean;
                status: string;
                due?: {
                  status: string;
                  label: string;
                  daysLate: number | null;
                  dueDate: string;
                };
                completedAt?: string | null;
              }) => {
                const dueStatus = d.due?.status as
                  | "OVERDUE"
                  | "DONE_LATE"
                  | "DONE_ON_TIME"
                  | "DUE_TODAY"
                  | undefined;
                return (
                  <li
                    key={d.dayNumber}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${itemRow}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {d.done ? (
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${
                            d.due?.status === "DONE_LATE"
                              ? "text-orange-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        />
                      ) : d.due?.status === "OVERDUE" ? (
                        <Clock className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                      ) : d.status === "current" || d.status === "open" ? (
                        <Target className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-200">
                          Day {d.dayNumber}: {d.title}
                        </p>
                        <p className="truncate text-xs text-slate-600 dark:text-slate-500">
                          {[
                            d.projectName,
                            d.due?.label,
                            d.completedAt
                              ? `done ${formatDisplayDate(d.completedAt)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        dueStatus &&
                        ["OVERDUE", "DONE_LATE", "DONE_ON_TIME", "DUE_TODAY"].includes(dueStatus)
                          ? dueBadgeClass(dueStatus)
                          : d.status === "current"
                            ? "text-blue-700 dark:text-blue-300"
                            : d.done
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-slate-500"
                      }`}
                    >
                      {d.percent}%
                    </span>
                  </li>
                );
              }
            )}
          </ul>
        )}

        {(!dayWise || dayWise.source === "empty") && (
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-500">
            No day-wise plan yet. Your Team Lead will set up the curriculum.
          </p>
        )}
      </div>

      {/* Secondary course stats */}
      <div>
        <h3 className={`mb-3 ${sectionLabel}`}>Course review</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: "Courses", value: overall.totalCourses },
            { icon: Target, label: "Completed", value: overall.completedCourses },
            { icon: Flame, label: "Streak", value: `${overall.currentStreak}d` },
          ].map((stat) => (
            <div key={stat.label} className={`flex items-center gap-3 ${statCard}`}>
              <stat.icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-500">{stat.label}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {courseProgress?.length > 0 && (
        <div className={panelCard}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Courses</h3>
            <Link
              href="/trainee/courses"
              className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              Course Library
            </Link>
          </div>
          <div className="space-y-3">
            {courseProgress.map((course: any) => (
              <div
                key={course.courseId}
                className={`overflow-hidden ${itemRow} !bg-slate-50 p-0 dark:!bg-slate-900/30`}
              >
                <button
                  type="button"
                  onClick={() => toggleCourse(course.courseId)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProgressRing percent={course.progressPercent} size={48} strokeWidth={5} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {course.courseName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-500">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition dark:text-slate-400 ${
                      expandedCourses.has(course.courseId) ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedCourses.has(course.courseId) && (
                  <div className="space-y-2 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/30">
                    {course.moduleProgress.map((module: any) => (
                      <div key={module.moduleId}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">
                            {module.moduleName}
                          </span>
                          <span className="text-slate-500">{Math.round(module.progress)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                            style={{ width: `${module.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivity?.length > 0 && (
        <div className={panelCard}>
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Recent activity
          </h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((activity: any, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2.5 ${itemRow} !bg-slate-50 dark:!bg-slate-950/40`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {activity.lessonTitle}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-500">
                    {activity.courseName}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-600 dark:text-slate-500">
                  {activity.completed ? "Done" : `${Math.round(activity.watchPercent)}%`}
                  {activity.completedAt && (
                    <p>
                      {formatDistanceToNow(new Date(activity.completedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements?.filter((a: { earned: boolean }) => a.earned).length > 0 && (
        <div className={panelCard}>
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Achievements
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements
              .filter((a: { earned: boolean }) => a.earned)
              .map(
                (achievement: {
                  id: string;
                  icon?: string;
                  title: string;
                  description?: string;
                }) => (
                  <div
                    key={achievement.id}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {achievement.title}
                    </p>
                    {achievement.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {achievement.description}
                      </p>
                    )}
                  </div>
                )
              )}
          </div>
        </div>
      )}
    </div>
  );
}
