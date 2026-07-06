import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  HelpCircle,
  Lock,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { onboardingProgress, onboardingSteps } from "@/lib/onboarding-data";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (user.role === "ADMIN") {
    const [users, courses, lessons, quizzes, attempts] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.quizAttempt.count(),
    ]);

    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin Command Center</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Run onboarding from one place</h1>
              <p className="mt-2 max-w-3xl text-slate-400">
                Manage users, training content, quiz questions, publishing status, and completion reporting.
              </p>
            </div>
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Open Content Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-5">
            {[
              { label: "Users", value: users, icon: Users },
              { label: "Programs", value: courses, icon: FolderKanban },
              { label: "Lessons", value: lessons, icon: FileText },
              { label: "Quizzes", value: quizzes, icon: HelpCircle },
              { label: "Attempts", value: attempts, icon: Award },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <Icon className="h-5 w-5 text-blue-300" />
                  <p className="mt-3 text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "User & Role Setup",
                body: "Create employee and team lead accounts, assign departments, and keep inactive users out of reporting.",
                href: "/admin/users",
                action: "Manage Users",
              },
              {
                title: "Training & Quiz Builder",
                body: "Add programs, modules, lessons, SOP/PPRT content, and certification quiz questions.",
                href: "/admin/content",
                action: "Edit Content",
              },
              {
                title: "Progress Governance",
                body: "See who is stuck, who passed certification, and which team needs follow-up.",
                href: "/admin/progress",
                action: "View Reports",
              },
            ].map((card) => (
              <Link key={card.title} href={card.href} className="rounded-lg border border-slate-800 bg-slate-900 p-5 hover:border-blue-500/60">
                <h2 className="font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm text-slate-400">{card.body}</p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-300">
                  {card.action}
                  <ArrowRight className="h-4 w-4" />
                </p>
              </Link>
            ))}
          </section>
        </div>
      </AppShell>
    );
  }

  if (user.role === "TRAINER") {
    const [employees, submissions, pendingReviews, courses] = await Promise.all([
      prisma.user.count({ where: { role: "TRAINEE" } }),
      prisma.dailySubmission.count(),
      prisma.dailySubmission.count({ where: { trainerReview: null } }),
      prisma.course.count({ where: { published: true } }),
    ]);

    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Team Lead Workspace</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Move employees through onboarding</h1>
              <p className="mt-2 max-w-3xl text-slate-400">
                Your focus is supervision: unblock manual steps, review submissions, and watch certification readiness.
              </p>
            </div>
            <Link
              href="/admin/progress"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Open Team Progress
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Employees", value: employees, icon: Users },
              { label: "Published Training", value: courses, icon: BookOpen },
              { label: "Submissions", value: submissions, icon: FileText },
              { label: "Need Review", value: pendingReviews, icon: Clock },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <Icon className="h-5 w-5 text-blue-300" />
                  <p className="mt-3 text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Today’s Team Lead Queue</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {[
                ["Manual setup checks", "Confirm accounts, tools, policy reading, and introductions."],
                ["Training health", "Find employees stuck before project training or quiz."],
                ["Certification readiness", "Retake coaching for anyone below the 80% pass threshold."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg bg-slate-950/50 p-4">
                  <p className="font-medium text-white">{title}</p>
                  <p className="mt-2 text-sm text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  const progress = onboardingProgress();

  // Fetch assigned projects dynamically
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    include: {
      project: {
        include: {
          categoryRel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  const activeProject = assignments.find((a) => a.project.active)?.project;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Employee Onboarding</p>
            <h1 className="mt-3 text-3xl font-bold text-white">Your path to live project work</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Complete setup, read the rules, study project guidelines, and pass certification.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Continue Onboarding
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Your Progress</p>
            <p className="mt-3 text-4xl font-bold text-white">{progress.percent}%</p>
            <p className="mt-1 text-sm text-slate-500">
              {progress.completed} of {progress.total} steps
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <FolderKanban className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm text-slate-400">Active Project</p>
            {activeProject ? (
              <>
                <p className="mt-1 text-3xl font-bold text-white">{activeProject.name}</p>
                <p className="mt-1 text-sm text-slate-500">{activeProject.categoryRel?.name || activeProject.description || "Training"}</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold text-white">None</p>
                <p className="mt-1 text-sm text-slate-500">No projects assigned</p>
              </>
            )}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <Award className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-sm text-slate-400">Certification Target</p>
            <p className="mt-1 text-3xl font-bold text-white">80%</p>
            <p className="mt-1 text-sm text-slate-500">Pass threshold</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Next Steps</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            {onboardingSteps.map((step, index) => {
              const Icon = step.status === "done" ? CheckCircle2 : step.status === "locked" ? Lock : Clock;
              return (
                <div key={step.title} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-blue-300" />
                  </div>
                  <h3 className="mt-4 min-h-12 font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{step.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    {step.status}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
