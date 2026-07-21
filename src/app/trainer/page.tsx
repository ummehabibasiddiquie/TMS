import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Users, BookOpen, ClipboardCheck, CalendarDays } from "lucide-react";
import { ACTIVE_USER, PUBLISHED_COURSE } from "@/lib/active-filters";
import { redirect } from "next/navigation";

export default async function TrainerDashboard() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "TRAINER" && user.role !== "ADMIN") redirect("/");

  const trainees = await prisma.traineeProfile.count({
    where: {
      trainerId: user.id,
      user: ACTIVE_USER,
    },
  });
  const courses = await prisma.course.count({ where: PUBLISHED_COURSE });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Team Lead Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Users, label: "My Trainees", value: trainees },
          { icon: BookOpen, label: "Published Courses", value: courses },
          { icon: ClipboardCheck, label: "Day Curriculum", value: "Open", href: "/admin/curriculum" },
        ].map((s) => {
          const Icon = s.icon;
          const inner = (
            <div className="glass-panel flex items-center gap-4 p-5">
              <Icon className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          );
          return "href" in s && s.href ? (
            <Link key={s.label} href={s.href} className="block hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href="/trainer/courses" className="glass-panel px-6 py-4 hover:ring-2 hover:ring-blue-500">
          Courses
        </Link>
        <Link href="/admin/progress" className="glass-panel px-6 py-4 hover:ring-2 hover:ring-blue-500">
          Team Progress
        </Link>
        <Link
          href="/trainer/day-reviews"
          className="glass-panel inline-flex items-center gap-2 px-6 py-4 hover:ring-2 hover:ring-blue-500"
        >
          <CalendarDays className="h-4 w-4" />
          Day Reviews
        </Link>
      </div>
    </div>
  );
}
