"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Clock,
  FolderKanban,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { DashboardStats, TraineeAttentionRow } from "@/lib/dashboard-stats";
import { dueSummaryChipClass } from "@/lib/progress-band";
import { ProgressBandBadge } from "@/components/learning/ProgressBandBadge";
import {
  DashboardAlert,
  DashboardQuickLink,
  DashboardStatCard,
  dashboardBtnPrimary,
  dashboardGreeting,
} from "@/components/dashboard/shared";

type Props = {
  name: string;
  stats: DashboardStats;
};

function attentionLabel(row: TraineeAttentionRow): string {
  if (row.reason === "OVERDUE") {
    return `${row.overdueCount} day${row.overdueCount === 1 ? "" : "s"} overdue`;
  }
  if (row.reason === "DUE_TODAY") {
    return `${row.dueTodayCount} due today`;
  }
  return "Awaiting evaluation decision";
}

function attentionChipClass(row: TraineeAttentionRow): string {
  if (row.reason === "OVERDUE") return dueSummaryChipClass("OVERDUE");
  if (row.reason === "DUE_TODAY") return dueSummaryChipClass("DUE_TODAY");
  return "inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200";
}

function calculateProgressDistribution(attention: TraineeAttentionRow[]) {
  if (attention.length === 0) {
    return { onTrack: 0, behind: 0, atRisk: 0, awaiting: 0 };
  }

  const total = attention.length;
  const onTrack = attention.filter(r => r.reason === "DUE_TODAY" && r.overallPercent >= 50).length;
  const behind = attention.filter(r => r.reason === "DUE_TODAY" && r.overallPercent < 50).length;
  const atRisk = attention.filter(r => r.reason === "OVERDUE").length;
  const awaiting = attention.filter(r => r.reason === "AWAITING_EVALUATION").length;

  return {
    onTrack: Math.round((onTrack / total) * 100),
    behind: Math.round((behind / total) * 100),
    atRisk: Math.round((atRisk / total) * 100),
    awaiting: Math.round((awaiting / total) * 100),
  };
}

export function AdminOverview({ name, stats }: Props) {
  const firstName = name.split(" ")[0] || name;

  // Calculate progress distribution
  const progressDistribution = calculateProgressDistribution(stats.attention);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50/90 via-white to-slate-100 p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-none">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/10" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {dashboardGreeting()}, {firstName}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              Admin Command Center
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Snapshot of trainees, training content, and items waiting on you.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin/progress" className={dashboardBtnPrimary}>
                Open Progress Reports
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Trainees", value: stats.activeTrainees },
              { label: "Certs pending", value: stats.pendingCerts },
              { label: "Need decision", value: stats.awaitingEvaluation },
            ].map((pill) => (
              <div
                key={pill.label}
                className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {pill.label}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {pill.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(stats.overdueTrainees > 0 ||
        stats.dueTodayTrainees > 0 ||
        stats.awaitingEvaluation > 0 ||
        stats.pendingCerts > 0) && (
        <section className="flex flex-wrap gap-3">
          {stats.overdueTrainees > 0 && (
            <DashboardAlert
              tone="red"
              title={`${stats.overdueTrainees} trainee${stats.overdueTrainees === 1 ? "" : "s"} with overdue days`}
              body="Review progress and follow up with team leads."
              href="/admin/progress"
              action="View progress"
            />
          )}
          {stats.dueTodayTrainees > 0 && (
            <DashboardAlert
              tone="amber"
              title={`${stats.dueTodayTrainees} trainee${stats.dueTodayTrainees === 1 ? "" : "s"} due today`}
              body="Check who should finish today's schedule items."
              href="/admin/progress"
              action="Open reports"
            />
          )}
          {stats.awaitingEvaluation > 0 && (
            <DashboardAlert
              tone="blue"
              title={`${stats.awaitingEvaluation} awaiting hire/reject decision`}
              body="Final quiz complete — review overall performance."
              href="/admin/progress"
              action="Make decisions"
            />
          )}
          {stats.pendingCerts > 0 && (
            <DashboardAlert
              tone="blue"
              title={`${stats.pendingCerts} certificate${stats.pendingCerts === 1 ? "" : "s"} to approve`}
              body="Project and final quiz certs need review."
              href="/admin/certifications"
              action="Review certs"
            />
          )}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Active Trainees"
          value={stats.activeTrainees}
          icon={Users}
          href="/admin/users"
          accent="from-sky-500/15"
        />
        <DashboardStatCard
          label="Courses"
          value={stats.courses}
          icon={BookOpen}
          href="/admin/content"
          accent="from-violet-500/15"
        />
        <DashboardStatCard
          label="Projects"
          value={stats.projects}
          icon={FolderKanban}
          href="/admin/projects"
          accent="from-amber-500/15"
        />
        <DashboardStatCard
          label="Certs to approve"
          value={stats.pendingCerts}
          icon={Award}
          href="/admin/certifications"
          accent="from-emerald-500/15"
        />
      </section>

      {/* Progress Distribution Chart */}
      {stats.attention.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Training Progress Distribution</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { label: "On Track", value: progressDistribution.onTrack, color: "bg-emerald-500", bgLight: "bg-emerald-100 dark:bg-emerald-500/20" },
                { label: "Behind Schedule", value: progressDistribution.behind, color: "bg-amber-500", bgLight: "bg-amber-100 dark:bg-amber-500/20" },
                { label: "At Risk", value: progressDistribution.atRisk, color: "bg-red-500", bgLight: "bg-red-100 dark:bg-red-500/20" },
                { label: "Awaiting Decision", value: progressDistribution.awaiting, color: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-500/20" },
              ].map((segment) => (
                <div key={segment.label} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {segment.label}
                  </div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${segment.color}`}
                        style={{ width: `${segment.value}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {segment.value}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity Timeline */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {stats.pendingCerts > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.pendingCerts} certification{stats.pendingCerts === 1 ? '' : 's'} pending review
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Project and final quiz certificates awaiting approval
                  </p>
                </div>
              </div>
            )}
            {stats.dayReviewsGiven > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.dayReviewsGiven} day review{stats.dayReviewsGiven === 1 ? '' : 's'} completed
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Trainee day work has been reviewed
                  </p>
                </div>
              </div>
            )}
            {stats.awaitingEvaluation > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                  <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.awaitingEvaluation} trainee{stats.awaitingEvaluation === 1 ? '' : 's'} awaiting evaluation
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Final quiz complete — hire/reject decision needed
                  </p>
                </div>
              </div>
            )}
            {stats.pendingCerts === 0 && stats.dayReviewsGiven === 0 && stats.awaitingEvaluation === 0 && (
              <div className="flex items-center justify-center py-8 text-center">
                <div className="text-slate-500 dark:text-slate-400">
                  <Sparkles className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2 text-sm">No recent activity to display</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {stats.attention.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Needs attention</h2>
            </div>
            <Link
              href="/admin/progress"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
            >
              All trainees
            </Link>
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stats.attention.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/progress?userId=${row.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Day {row.currentDay}
                      {row.totalDays > 0 ? ` of ${row.totalDays}` : ""}
                      {" · "}
                      {row.overallPercent}% complete
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={attentionChipClass(row)}>{attentionLabel(row)}</span>
                    <ProgressBandBadge
                      overallPercent={row.overallPercent}
                      currentDay={row.currentDay}
                      totalDays={row.totalDays}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-4 w-4" />
          Quick links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardQuickLink
            title="Users"
            body="Add Admin, Team Lead, or Employee accounts and assign Team Leads."
            href="/admin/users"
            action="Manage Users"
          />
          <DashboardQuickLink
            title="Progress"
            body="Day-wise and detailed progress for every trainee."
            href="/admin/progress"
            action="View reports"
          />
          <DashboardQuickLink
            title="Cert Approvals"
            body="Approve or reject project and final quiz certificates."
            href="/admin/certifications"
            action="Review certs"
          />
        </div>
      </section>

    </div>
  );
}

export function TeamLeadOverview({ name, stats }: Props) {
  const firstName = name.split(" ")[0] || name;

  // Calculate progress distribution
  const progressDistribution = calculateProgressDistribution(stats.attention);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50/90 via-white to-slate-100 p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-none">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-500/10" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {dashboardGreeting()}, {firstName}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              Team Lead Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Your assigned trainees and items that need attention.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin/progress" className={dashboardBtnPrimary}>
                Open Team Progress
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "My trainees", value: stats.activeTrainees },
              { label: "Certs pending", value: stats.pendingCerts },
              { label: "Reviews given", value: stats.dayReviewsGiven },
            ].map((pill) => (
              <div
                key={pill.label}
                className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {pill.label}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {pill.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(stats.overdueTrainees > 0 ||
        stats.dueTodayTrainees > 0 ||
        stats.pendingCerts > 0) && (
        <section className="flex flex-wrap gap-3">
          {stats.overdueTrainees > 0 && (
            <DashboardAlert
              tone="red"
              title={`${stats.overdueTrainees} trainee${stats.overdueTrainees === 1 ? "" : "s"} with overdue days`}
              body="Follow up and help them catch up on open days."
              href="/admin/progress"
              action="View team progress"
            />
          )}
          {stats.dueTodayTrainees > 0 && (
            <DashboardAlert
              tone="amber"
              title={`${stats.dueTodayTrainees} trainee${stats.dueTodayTrainees === 1 ? "" : "s"} due today`}
              body="Check today's schedule and work completion."
              href="/admin/progress"
              action="Open progress"
            />
          )}
          {stats.pendingCerts > 0 && (
            <DashboardAlert
              tone="blue"
              title={`${stats.pendingCerts} certificate${stats.pendingCerts === 1 ? "" : "s"} to approve`}
              body="Review project and final quiz submissions."
              href="/admin/certifications"
              action="Review certs"
            />
          )}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Active Trainees"
          value={stats.activeTrainees}
          icon={Users}
          href="/admin/users"
          accent="from-sky-500/15"
        />
        <DashboardStatCard
          label="Certs to approve"
          value={stats.pendingCerts}
          icon={Award}
          href="/admin/certifications"
          accent="from-emerald-500/15"
        />
        <DashboardStatCard
          label="Day reviews given"
          value={stats.dayReviewsGiven}
          icon={Clock}
          href="/trainer/day-reviews"
          accent="from-violet-500/15"
        />
        <DashboardStatCard
          label="Published courses"
          value={stats.courses}
          icon={BookOpen}
          href="/trainer/courses"
          accent="from-amber-500/15"
        />
      </section>

      {/* Progress Distribution Chart */}
      {stats.attention.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Team Progress Distribution</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { label: "On Track", value: progressDistribution.onTrack, color: "bg-emerald-500", bgLight: "bg-emerald-100 dark:bg-emerald-500/20" },
                { label: "Behind Schedule", value: progressDistribution.behind, color: "bg-amber-500", bgLight: "bg-amber-100 dark:bg-amber-500/20" },
                { label: "At Risk", value: progressDistribution.atRisk, color: "bg-red-500", bgLight: "bg-red-100 dark:bg-red-500/20" },
                { label: "Awaiting Decision", value: progressDistribution.awaiting, color: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-500/20" },
              ].map((segment) => (
                <div key={segment.label} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {segment.label}
                  </div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${segment.color}`}
                        style={{ width: `${segment.value}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {segment.value}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity Timeline */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {stats.pendingCerts > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.pendingCerts} certification{stats.pendingCerts === 1 ? '' : 's'} pending review
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Team project and final quiz certificates awaiting approval
                  </p>
                </div>
              </div>
            )}
            {stats.dayReviewsGiven > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {stats.dayReviewsGiven} day review{stats.dayReviewsGiven === 1 ? '' : 's'} completed
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Your trainee day work has been reviewed
                  </p>
                </div>
              </div>
            )}
            {stats.pendingCerts === 0 && stats.dayReviewsGiven === 0 && (
              <div className="flex items-center justify-center py-8 text-center">
                <div className="text-slate-500 dark:text-slate-400">
                  <Sparkles className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2 text-sm">No recent activity to display</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {stats.attention.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Your team</h2>
            </div>
            <Link
              href="/admin/progress"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
            >
              All trainees
            </Link>
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stats.attention.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/progress?userId=${row.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Day {row.currentDay}
                      {row.totalDays > 0 ? ` of ${row.totalDays}` : ""}
                      {" · "}
                      {row.overallPercent}% complete
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={attentionChipClass(row)}>{attentionLabel(row)}</span>
                    <ProgressBandBadge
                      overallPercent={row.overallPercent}
                      currentDay={row.currentDay}
                      totalDays={row.totalDays}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-4 w-4" />
          Quick links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardQuickLink
            title="Manage trainees"
            body="Add Employee accounts for your team."
            href="/admin/users"
            action="Add or edit trainees"
          />
          <DashboardQuickLink
            title="Team Progress"
            body="Day-wise and detailed progress for each trainee."
            href="/admin/progress"
            action="View progress"
          />
          <DashboardQuickLink
            title="Day Reviews"
            body="See completed day work and leave optional feedback."
            href="/trainer/day-reviews"
            action="Review days"
          />
        </div>
      </section>

    </div>
  );
}
