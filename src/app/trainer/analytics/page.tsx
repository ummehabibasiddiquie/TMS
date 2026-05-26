import { prisma } from "@/lib/db";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";

export default async function TrainerAnalyticsPage() {
  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: { select: { name: true, employeeId: true } },
      course: { select: { title: true } },
    },
  });

  const quizAttempts = await prisma.quizAttempt.findMany();
  const submissions = await prisma.dailySubmission.findMany();

  const courseCompletion = enrollments.reduce(
    (acc, e) => {
      const key = e.course.title;
      if (!acc[key]) acc[key] = { name: key, total: 0, completed: 0, avgProgress: 0 };
      acc[key].total++;
      acc[key].avgProgress += e.progressPercent;
      if (e.progressPercent >= 100) acc[key].completed++;
      return acc;
    },
    {} as Record<string, { name: string; total: number; completed: number; avgProgress: number }>
  );

  const courseData = Object.values(courseCompletion).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    completionRate: c.total ? Math.round((c.completed / c.total) * 100) : 0,
    avgProgress: c.total ? Math.round(c.avgProgress / c.total) : 0,
  }));

  const avgQuizScore =
    quizAttempts.length > 0
      ? quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length
      : 0;

  const totalLearningTime = await prisma.lessonProgress.aggregate({
    _sum: { timeSpentSec: true },
  });

  const engagementByDay = Array.from({ length: 7 }, (_, i) => {
    const day = 7 - i;
    const count = submissions.filter((s) => {
      const d = new Date(s.submittedAt);
      const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= day && diff > day - 1;
    }).length;
    return { day: `D-${day}`, submissions: count };
  }).reverse();

  const dropOff = courseData.map((c) => ({
    name: c.name,
    dropOff: 100 - c.avgProgress,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Course Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">Avg Assessment Score</p>
          <p className="text-3xl font-bold">{Math.round(avgQuizScore)}%</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">Total Learning Time</p>
          <p className="text-3xl font-bold">
            {Math.round((totalLearningTime._sum.timeSpentSec ?? 0) / 3600)}h
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">Active Enrollments</p>
          <p className="text-3xl font-bold">{enrollments.length}</p>
        </div>
      </div>

      <AnalyticsCharts
        courseData={courseData}
        dropOff={dropOff}
        engagementByDay={engagementByDay}
      />

      <div className="glass-panel overflow-hidden">
        <h3 className="border-b border-slate-700 p-4 font-semibold">Trainee Progress</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-left text-slate-400">
            <tr>
              <th className="p-4">Trainee</th>
              <th className="p-4">Course</th>
              <th className="p-4">Progress</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-t border-slate-800">
                <td className="p-4">{e.user.name}</td>
                <td className="p-4">{e.course.title}</td>
                <td className="p-4">{Math.round(e.progressPercent)}%</td>
                <td className="p-4">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
