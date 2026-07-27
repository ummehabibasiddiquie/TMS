import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  FolderKanban,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import {
  ACTIVE_USER,
  PUBLISHED_COURSE,
} from "@/lib/active-filters";
import { listHrmsProjects } from "@/lib/hrms";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  // New joiners land on Today’s Work (day checklist / lessons)
  if (user.role === "TRAINEE") {
    redirect("/trainee/training");
  }

  if (user.role === "ADMIN") {
    const [trainees, hrms, courses, pendingCerts] = await Promise.all([
      prisma.user.count({ where: { role: "TRAINEE", ...ACTIVE_USER } }),
      listHrmsProjects({ activeOnly: true }),
      prisma.course.count({ where: PUBLISHED_COURSE }),
      prisma.projectCertification.count({
        where: {
          status: "PENDING_REVIEW",
          user: { role: "TRAINEE", ...ACTIVE_USER },
        },
      }),
    ]);
    const projects = hrms.projects.length;

    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                Admin Command Center
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">Overview</h1>
              <p className="mt-2 max-w-xl text-slate-400">
                Quick snapshot of trainees, training content, and items waiting on you.
              </p>
            </div>
            <Link
              href="/admin/progress"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Open Progress Reports
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Trainees", value: trainees, icon: Users, href: "/admin/users" },
              { label: "Courses", value: courses, icon: BookOpen, href: "/admin/content" },
              { label: "Projects", value: projects, icon: FolderKanban, href: "/admin/projects" },
              {
                label: "Certs to approve",
                value: pendingCerts,
                icon: Award,
                href: "/admin/certifications",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 transition hover:border-blue-500/50"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-blue-300" />
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                </Link>
              );
            })}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Users",
                body: "Add Admin, Team Lead, or Employee accounts and assign Team Leads.",
                href: "/admin/users",
                action: "Manage Users",
              },
              {
                title: "Day Curriculum",
                body: "Set the default schedule or add an extra training week for someone who needs it.",
                href: "/admin/curriculum",
                action: "Edit curriculum",
              },
              {
                title: "Progress",
                body: "Day-wise and detailed progress for every trainee.",
                href: "/admin/progress",
                action: "View reports",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500/60"
              >
                <h2 className="font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-300">
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

  // Team Lead
  const teamFilter = {
    ...ACTIVE_USER,
    role: "TRAINEE" as const,
    traineeProfile: { trainerId: user.id },
  };

  const [employees, pendingCerts, dayReviews] = await Promise.all([
    prisma.user.count({ where: teamFilter }),
    prisma.projectCertification.count({
      where: {
        status: "PENDING_REVIEW",
        user: teamFilter,
      },
    }),
    prisma.dayWorkReview.count({
      where: {
        reviewerId: user.id,
      },
    }),
  ]);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              Team Lead Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Overview</h1>
            <p className="mt-2 max-w-xl text-slate-400">
              Your assigned trainees and items that need attention.
            </p>
          </div>
          <Link
            href="/admin/progress"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Open Team Progress
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active Trainees", value: employees, icon: Users, href: "/admin/users" },
            {
              label: "Certs to approve",
              value: pendingCerts,
              icon: Award,
              href: "/admin/certifications",
            },
            {
              label: "Day reviews given",
              value: dayReviews,
              icon: Clock,
              href: "/trainer/day-reviews",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 transition hover:border-blue-500/50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-300" />
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Day Curriculum",
              body: "Set or customize the day-wise schedule for your team.",
              href: "/admin/curriculum",
              action: "Open curriculum",
            },
            {
              title: "Day Reviews",
              body: "See completed day work and leave optional feedback.",
              href: "/trainer/day-reviews",
              action: "Review days",
            },
            {
              title: "Team Progress",
              body: "Day-wise and detailed progress for each trainee.",
              href: "/admin/progress",
              action: "View progress",
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500/60"
            >
              <h2 className="font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-300">
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
