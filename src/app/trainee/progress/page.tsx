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
import { TrackerProgressPanel } from "@/components/tracker/TrackerProgressPanel";

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
        <p className="text-slate-400">Failed to load progress data.</p>
      </div>
    );
  }

  const { dayWise, overall, courseProgress, recentActivity, achievements } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Progress</h1>
        <p className="mt-2 text-slate-400">
          Today and overall onboarding first — production tracker work appears after training is
          complete (≥90%).
        </p>
      </div>

      <TrackerProgressPanel />

      {/* Day-wise onboarding */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              Onboarding & training
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {dayWise?.todayTitle || `Day ${dayWise?.currentDay ?? "—"}`}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Day {dayWise?.currentDay ?? 0} of {dayWise?.totalDays ?? 0}
              {dayWise?.todayDone ? " · Today complete" : ""}
            </p>
          </div>
          <Link
            href="/trainee/training"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            <ClipboardCheck className="h-4 w-4" />
            Today&apos;s Work
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-slate-700/80 bg-slate-950/40 p-4">
            <ProgressRing percent={dayWise?.todayPercent ?? 0} size={72} strokeWidth={6} />
            <div>
              <p className="text-xs uppercase text-slate-500">Today</p>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(dayWise?.todayPercent ?? 0)}%
              </p>
              <p className="text-xs text-slate-500">
                {dayWise?.todayCompleted ?? 0}/{dayWise?.todayTotal ?? 0} items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-700/80 bg-slate-950/40 p-4">
            <ProgressRing percent={dayWise?.overallPercent ?? 0} size={72} strokeWidth={6} />
            <div>
              <p className="text-xs uppercase text-slate-500">Overall onboarding</p>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(dayWise?.overallPercent ?? 0)}%
              </p>
              <p className="text-xs text-slate-500">Across all plan days</p>
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
              }) => (
                <li
                  key={d.dayNumber}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {d.status === "done" || d.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : d.status === "current" ? (
                      <Target className="h-4 w-4 shrink-0 text-blue-400" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-slate-600" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200">
                        Day {d.dayNumber}: {d.title}
                      </p>
                      {d.projectName && (
                        <p className="truncate text-xs text-slate-500">{d.projectName}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${
                      d.status === "current"
                        ? "text-blue-300"
                        : d.done
                          ? "text-emerald-300"
                          : "text-slate-500"
                    }`}
                  >
                    {d.percent}%
                  </span>
                </li>
              )
            )}
          </ul>
        )}

        {(!dayWise || dayWise.source === "empty") && (
          <p className="mt-4 text-sm text-slate-500">
            No day-wise plan yet. Your Team Lead will set up the curriculum.
          </p>
        )}
      </div>

      {/* Secondary course stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Course review
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: "Courses", value: overall.totalCourses },
            { icon: Target, label: "Completed", value: overall.completedCourses },
            { icon: Flame, label: "Streak", value: `${overall.currentStreak}d` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <stat.icon className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {courseProgress?.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Courses</h3>
            <Link href="/trainee/courses" className="text-sm text-blue-400 hover:underline">
              Course Library
            </Link>
          </div>
          <div className="space-y-3">
            {courseProgress.map((course: any) => (
              <div
                key={course.courseId}
                className="overflow-hidden rounded-xl border border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => toggleCourse(course.courseId)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProgressRing percent={course.progressPercent} size={48} strokeWidth={5} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{course.courseName}</p>
                      <p className="text-xs text-slate-500">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                      expandedCourses.has(course.courseId) ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedCourses.has(course.courseId) && (
                  <div className="space-y-2 border-t border-slate-800 bg-slate-950/30 p-4">
                    {course.moduleProgress.map((module: any) => (
                      <div key={module.moduleId}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-400">{module.moduleName}</span>
                          <span className="text-slate-500">{Math.round(module.progress)}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="mb-3 text-lg font-semibold">Recent activity</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{activity.lessonTitle}</p>
                  <p className="truncate text-xs text-slate-500">{activity.courseName}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="mb-3 text-lg font-semibold">Achievements</h3>
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
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"
                  >
                    <p className="font-medium text-sm">{achievement.title}</p>
                    {achievement.description && (
                      <p className="mt-1 text-xs text-slate-400">{achievement.description}</p>
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
