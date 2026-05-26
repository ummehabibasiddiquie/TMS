import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Users, BookOpen, TrendingUp, ClipboardCheck } from "lucide-react";

export default async function TrainerDashboard() {
  const user = await getSession();
  const trainees = await prisma.traineeProfile.count({
    where: { trainerId: user?.id },
  });
  const courses = await prisma.course.count({ where: { published: true } });
  const pendingReviews = await prisma.trainerReview.count({
    where: { reviewerId: user?.id, status: "PENDING" },
  });
  const avgProgress = await prisma.enrollment.aggregate({
    _avg: { progressPercent: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: "My Trainees", value: trainees },
          { icon: BookOpen, label: "Published Courses", value: courses },
          { icon: TrendingUp, label: "Avg Course Progress", value: `${Math.round(avgProgress._avg.progressPercent ?? 0)}%` },
          { icon: ClipboardCheck, label: "Pending Reviews", value: pendingReviews },
        ].map((s) => (
          <div key={s.label} className="glass-panel flex items-center gap-4 p-5">
            <s.icon className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <Link href="/trainer/courses" className="glass-panel px-6 py-4 hover:ring-2 hover:ring-blue-500">
          Manage Courses
        </Link>
        <Link href="/trainer/analytics" className="glass-panel px-6 py-4 hover:ring-2 hover:ring-blue-500">
          View Analytics
        </Link>
        <Link href="/trainer/reviews" className="glass-panel px-6 py-4 hover:ring-2 hover:ring-blue-500">
          Daily Reviews
        </Link>
      </div>
    </div>
  );
}
