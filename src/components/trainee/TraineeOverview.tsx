"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { DayWisePlan } from "@/lib/day-wise-training";
import type { TraineeWorkSummary } from "@/lib/trainee-work";
import {
  dueToneClass,
  resolvePace,
  resolveProgressBand,
  dueSummaryChipClass,
  formatFinishedLateLabel,
} from "@/lib/progress-band";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { formatDisplayDate, parseAppDate } from "@/lib/format-date";
import { dueDateForDay } from "@/lib/day-due";

type Props = {
  name: string;
  plan: DayWisePlan;
  work: TraineeWorkSummary;
};

/** Shared CTAs so hero and cards use the same button look on this page. */
const overviewBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:shadow-blue-950/25";

const overviewBtnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-none dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:focus-visible:outline-slate-500";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Avoid "Day 6: Day 6" when curriculum title duplicates the day label. */
function dayDisplayTitle(dayNumber: number, title: string, projectName?: string | null) {
  const t = title.trim();
  const isRedundant =
    /^day\s*\d+\s*$/i.test(t) || t.toLowerCase() === `day ${dayNumber}`.toLowerCase();
  if (isRedundant) {
    return projectName?.trim() || `Training day ${dayNumber}`;
  }
  return t;
}

function scheduledDateForDay(plan: DayWisePlan, dayNumber: number): string | null {
  const entry = plan.allDays.find((d) => d.dayNumber === dayNumber);
  const iso = entry?.due?.dueDate?.trim();
  if (iso) {
    const label = formatDisplayDate(iso, "");
    return label || null;
  }
  const start = parseAppDate(plan.trainingStart);
  if (!start) return null;
  const label = formatDisplayDate(dueDateForDay(start, dayNumber), "");
  return label || null;
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export function TraineeOverview({ name, plan, work }: Props) {
  const firstName = name.split(" ")[0] || name;
  const band = resolveProgressBand({
    overallPercent: plan.overallPercent,
    currentDay: plan.currentDay,
    totalDays: plan.totalDays,
  });
  const pace = resolvePace({
    overallPercent: plan.overallPercent,
    currentDay: plan.currentDay,
    totalDays: plan.totalDays,
  });
  const today = plan.today;
  const due = plan.dueSummary;
  const totals = work.totals;
  const daysDone = plan.allDays.filter((d) => d.done).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      {/* Hero — light gradient only in light; dark uses slate base + band tint overlay */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50/90 via-white to-slate-100 p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-none">
        <div
          className={`pointer-events-none absolute inset-0 hidden bg-gradient-to-br dark:block ${band.soft}`}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl dark:bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-500/10" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Your training overview
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              See where you stand, catch overdue days, and jump into today&apos;s work.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${band.badge}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {band.label}
              </span>
              <span className={`text-sm font-medium ${pace.className}`}>
                {pace.label}
              </span>
              {plan.trainingStart && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Started {formatDisplayDate(plan.trainingStart)}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {band.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/trainee/training" className={overviewBtnPrimary}>
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                Continue today&apos;s work
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link href="/trainee/progress" className={overviewBtnSecondary}>
                Full progress
              </Link>
            </div>
          </div>

          <div className="relative flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none">
            <ProgressRing
              percent={plan.overallPercent}
              size={148}
              strokeWidth={10}
              color={band.ring}
              label="Overall"
            />
            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              Day {plan.currentDay}
              {plan.totalDays > 0 ? ` of ${plan.totalDays}` : ""}
              {" · "}
              {daysDone} day{daysDone === 1 ? "" : "s"} complete
            </p>
          </div>
        </div>

        {/* Level ladder */}
        <div className="relative mt-4">
          <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-500">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Excellent</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${band.bar}`}
              style={{ width: `${Math.max(4, Math.min(100, plan.overallPercent))}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500 dark:text-slate-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {(due.overdueCount > 0 || due.dueTodayCount > 0 || due.doneLateCount > 0) && (
        <section className="flex flex-wrap gap-2">
          {due.overdueCount > 0 && (
            <div className="flex min-w-[200px] flex-1 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">
                  {due.overdueCount} day{due.overdueCount === 1 ? "" : "s"} overdue
                </p>
                <p className="mt-0.5 text-sm text-red-700/90 dark:text-red-300/80">
                  Catch up anytime — open days can be finished in any order.
                </p>
              </div>
            </div>
          )}
          {due.dueTodayCount > 0 && (
            <div className="flex min-w-[200px] flex-1 items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {due.dueTodayCount} due today
                </p>
                <p className="mt-0.5 text-sm text-amber-800/90 dark:text-amber-200/80">
                  Finish today&apos;s checklist to stay on track.
                </p>
              </div>
            </div>
          )}
          {due.doneLateCount > 0 && (
            <div className="flex min-w-[200px] flex-1 items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-500/30 dark:bg-orange-500/10">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-700 dark:text-orange-300" />
              <div>
                <p className="font-semibold text-orange-950 dark:text-orange-100">
                  {formatFinishedLateLabel(due.doneLateCount)}
                </p>
                <p className="mt-0.5 text-sm text-orange-900/90 dark:text-orange-200/80">
                  Completed after the scheduled due date — you can still catch up on open days.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Current day + work metrics (single card) */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
        <div className="grid items-start lg:grid-cols-2 lg:divide-x lg:divide-slate-200 dark:lg:divide-slate-800">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800 lg:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Current training day
              </h2>
              {today?.due && (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${dueToneClass(
                    today.due.status
                  )}`}
                >
                  {today.due.label}
                </span>
              )}
            </div>
            {today ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Day {today.dayNumber}
                  {plan.totalDays > 0 ? ` of ${plan.totalDays}` : ""}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                  {dayDisplayTitle(today.dayNumber, today.title, today.projectName)}
                </p>
                {today.due?.dueDate ? (
                  <p className="mt-1 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                    {formatDisplayDate(today.due.dueDate)}
                  </p>
                ) : null}
                {today.projectName &&
                  dayDisplayTitle(today.dayNumber, today.title, today.projectName) !==
                    today.projectName.trim() && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {today.projectName}
                    </p>
                  )}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-600 dark:text-slate-500">
                    <span>
                      {today.completedCount}/{today.totalCount} checklist items
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-200">
                      {today.percent}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        today.done ? "bg-emerald-500" : band.bar
                      }`}
                      style={{ width: `${today.percent}%` }}
                    />
                  </div>
                </div>
                {today.done ? (
                  <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
                    Checklist complete for this day.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-500">
                No day plan yet. Ask Admin or your Team Lead to set up the curriculum.
              </p>
            )}
          </div>

          <div className="p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Work Metrics
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
              Totals recorded by Admin or Team Lead
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricPill
                label="Hours"
                value={totals.hoursLogged != null ? String(totals.hoursLogged) : "—"}
              />
              <MetricPill
                label="Production"
                value={
                  totals.productionScorePercent != null
                    ? `${totals.productionScorePercent}%`
                    : "—"
                }
              />
              <MetricPill
                label="Quality"
                value={
                  totals.qualityScore != null ? `${totals.qualityScore}%` : "—"
                }
              />
            </div>
            {work.projects.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-500">
                  By day
                </p>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
                  {work.projects
                    .slice()
                    .sort((a, b) => b.dayNumber - a.dayNumber)
                    .map((p) => {
                      const dateLabel = scheduledDateForDay(plan, p.dayNumber);
                      return (
                      <li
                        key={`${p.projectId}-${p.dayNumber}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-800 dark:text-slate-300">
                            Day {p.dayNumber}
                            {p.projectName ? ` · ${p.projectName}` : ""}
                          </span>
                          {dateLabel ? (
                            <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-slate-700 dark:text-slate-400">
                              {dateLabel}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-slate-800 dark:text-slate-400">
                          {p.hoursLogged != null ? `${p.hoursLogged} hours` : "—"}
                          {" · "}
                          Production{" "}
                          {p.productionScorePercent != null
                            ? `${p.productionScorePercent}%`
                            : "—"}
                          {" · "}
                          Quality{" "}
                          {p.qualityScore != null ? `${p.qualityScore}%` : "—"}
                        </span>
                      </li>
                      );
                    })}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-500">
                {work.message || "No work metrics recorded yet."}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/certifications",
            title: "Certificates",
            body: "View certificates, final quiz, and approval status.",
            icon: Sparkles,
          },
          {
            href: "/trainee/progress",
            title: "Detailed progress",
            body: "Every training day, due dates, and late status.",
            icon: TrendingUp,
          },
          {
            href: "/trainee/courses",
            title: "Course library",
            body: "Browse and review training courses.",
            icon: Target,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400/60 hover:shadow dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none dark:hover:border-blue-500/50"
            >
              <Icon className="h-5 w-5 text-blue-700 dark:text-blue-400 transition group-hover:scale-110" />
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{card.body}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
