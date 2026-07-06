import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDayLearningComplete } from "@/lib/progress";
import { ContinueLearning } from "@/components/learning/ContinueLearning";
import { LearningPathTimeline } from "@/components/learning/LearningPathTimeline";
import { AchievementBadges } from "@/components/learning/AchievementBadges";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { Flame, Clock, BookOpen, Target, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function TraineeDashboard() {
  const user = await getSession();
  if (!user) return null;

  const [profile, enrollments, streak, achievements, path, recentProgress] =
    await Promise.all([
      prisma.traineeProfile.findUnique({
        where: { userId: user.id },
        include: { trainer: { select: { name: true } } },
      }),
      prisma.enrollment.findMany({
        where: { userId: user.id },
        include: {
          course: {
            include: {
              modules: {
                orderBy: { order: "asc" },
                include: { lessons: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      }),
      prisma.learningStreak.findUnique({ where: { userId: user.id } }),
      prisma.achievement.findMany({
        include: {
          users: { where: { userId: user.id } },
        },
      }),
      prisma.learningPath.findFirst({
        where: { published: true },
        include: {
          courses: {
            orderBy: { order: "asc" },
            include: { course: true },
          },
        },
 }),
      prisma.lessonProgress.findMany({
        where: { userId: user.id, completed: true },
        orderBy: { completedAt: "desc" },
        take: 5,
        include: { lesson: { include: { module: { include: { course: true } } } } },
      }),
    ]);

  const currentDay = profile?.currentDayNumber ?? 1;
  const learningComplete = await isDayLearningComplete(user.id, currentDay);

  const primaryEnrollment = enrollments.find((e) => e.status === "IN_PROGRESS") ?? enrollments[0];
  let resumeLesson = null;
  if (primaryEnrollment) {
    const allLessons = primaryEnrollment.course.modules.flatMap((m) => m.lessons);
    const progress = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: allLessons.map((l) => l.id) },
      },
    });
    const doneIds = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
    resumeLesson =
      allLessons.find((l) => !doneIds.has(l.id)) ??
      allLessons[primaryEnrollment.lastLessonId ? 0 : 0];
  }

  const moduleProgress = primaryEnrollment
    ? primaryEnrollment.course.modules.map(async (mod) => {
        const lessonIds = mod.lessons.map((l) => l.id);
        const done = await prisma.lessonProgress.count({
          where: { userId: user.id, lessonId: { in: lessonIds }, completed: true },
        });
        return {
          title: mod.title,
          percent: lessonIds.length ? (done / lessonIds.length) * 100 : 0,
        };
      })
    : [];
  const modulesResolved = await Promise.all(moduleProgress);

  const pathSteps =
    path?.courses.map((pc, i) => {
      const en = enrollments.find((e) => e.courseId === pc.courseId);
      const pct = en?.progressPercent ?? 0;
      return {
        id: pc.id,
        title: pc.course.title,
        subtitle: `${Math.round(pct)}% complete`,
        status:
          pct >= 100
            ? ("completed" as const)
            : pct > 0
              ? ("current" as const)
              : i === 0
                ? ("available" as const)
                : ("locked" as const),
      };
    }) ?? [];

  const badges = achievements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    earned: a.users.length > 0,
    earnedAt: a.users[0]?.earnedAt,
  }));

  const totalTime = await prisma.lessonProgress.aggregate({
    where: { userId: user.id },
    _sum: { timeSpentSec: true },
  });

  const completedCourses = enrollments.filter((e) => e.status === "COMPLETED").length;
  const inProgressCourses = enrollments.filter((e) => e.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Learning Hub</h1>
        <p className="text-slate-400">
          Welcome back, {user.name}
        </p>
      </div>

      {!learningComplete && currentDay > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-200">Required learning incomplete</p>
          <p className="text-sm text-amber-200/80">
            Complete all required lessons for Day {currentDay} before daily submission.
          </p>
          <Link
            href="/trainee/training"
            className="mt-2 inline-block text-sm text-amber-300 underline"
          >
            View requirements →
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: BookOpen,
            label: "Courses",
            value: `${enrollments.length} enrolled`,
          },
          {
            icon: Target,
            label: "In Progress",
            value: `${inProgressCourses} courses`,
          },
          {
            icon: Award,
            label: "Completed",
            value: `${completedCourses} courses`,
          },
          { icon: Flame, label: "Learning Streak", value: `${streak?.currentStreak ?? 0} days` },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-600/20 p-3">
              <stat.icon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Target,
            label: "Course Progress",
            value: `${Math.round(primaryEnrollment?.progressPercent ?? 0)}%`,
          },
          {
            icon: Clock,
            label: "Time Spent",
            value: `${Math.round((totalTime._sum.timeSpentSec ?? 0) / 60)} min`,
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-600/20 p-3">
              <stat.icon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {primaryEnrollment && resumeLesson && (
        <ContinueLearning
          courseId={primaryEnrollment.courseId}
          courseTitle={primaryEnrollment.course.title}
          lessonTitle={resumeLesson.title}
          lessonId={resumeLesson.id}
          progressPercent={primaryEnrollment.progressPercent}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="mb-4 text-lg font-semibold">Module Progress</h3>
            <div className="space-y-4">
              {modulesResolved.map((m) => (
                <div key={m.title}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{m.title}</span>
                    <span className="text-slate-400">{Math.round(m.percent)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="mb-4 text-lg font-semibold">Recently Completed</h3>
            {recentProgress.length === 0 ? (
              <p className="text-sm text-slate-500">No lessons completed yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentProgress.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-slate-800/30 px-4 py-3"
                  >
                    <span>{p.lesson.title}</span>
                    <span className="text-xs text-slate-500">
                      {p.completedAt
                        ? formatDistanceToNow(p.completedAt, { addSuffix: true })
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel flex flex-col items-center p-6">
            <ProgressRing
              percent={primaryEnrollment?.progressPercent ?? 0}
              size={140}
              label="Overall"
            />
            {primaryEnrollment?.lastActivityAt && (
              <p className="mt-4 text-xs text-slate-500">
                Last activity:{" "}
                {formatDistanceToNow(primaryEnrollment.lastActivityAt, { addSuffix: true })}
              </p>
            )}
          </div>
          <LearningPathTimeline steps={pathSteps} />
        </div>
      </div>

      <AchievementBadges badges={badges} />
    </div>
  );
}
