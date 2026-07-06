import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { ChevronDown, Play, BookOpen, Clock } from "lucide-react";

export default async function CoursesPage() {
  const user = await getSession();
  if (!user) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  const progressAll = await prisma.lessonProgress.findMany({
    where: { userId: user.id },
  });
  const progressMap = new Map(progressAll.map((p) => [p.lessonId, p]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Courses</h1>
        <p className="mt-2 text-slate-400">View and manage your assigned courses and track progress.</p>
      </div>

      <div className="space-y-6">
        {enrollments.map((en) => {
          const totalModules = en.course.modules.length;
          const totalLessons = en.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
          const completedLessons = en.course.modules.reduce((sum, m) => {
            return sum + m.lessons.filter((l) => progressMap.get(l.id)?.completed).length;
          }, 0);

          return (
            <details key={en.id} className="glass-panel group overflow-hidden" open>
              <summary className="flex cursor-pointer list-none items-center gap-6 p-6 [&::-webkit-details-marker]:hidden">
                <ProgressRing percent={en.progressPercent} size={80} />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{en.course.title}</h3>
                  <p className="text-sm text-slate-400">{en.course.description}</p>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${
                      en.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : en.status === "IN_PROGRESS"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-slate-700 text-slate-400"
                    }`}>
                      {en.status.replace("_", " ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {totalModules} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {completedLessons}/{totalLessons} lessons
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-700 px-6 pb-6">
                {en.course.modules.map((mod) => {
                  const moduleCompletedLessons = mod.lessons.filter((l) => progressMap.get(l.id)?.completed).length;
                  const moduleProgress = mod.lessons.length > 0 ? (moduleCompletedLessons / mod.lessons.length) * 100 : 0;

                  return (
                    <div key={mod.id} className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-blue-300">{mod.title}</h4>
                        <span className="text-xs text-slate-500">{Math.round(moduleProgress)}%</span>
                      </div>
                      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                          style={{ width: `${moduleProgress}%` }}
                        />
                      </div>
                      <ul className="space-y-2">
                        {mod.lessons.map((lesson) => {
                          const lp = progressMap.get(lesson.id);
                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/trainee/courses/${en.courseId}/player?lesson=${lesson.id}`}
                                className="flex items-center justify-between rounded-xl bg-slate-800/40 px-4 py-3 hover:bg-slate-800/70"
                              >
                                <span className="flex items-center gap-2">
                                  <Play className="h-4 w-4 text-blue-400" />
                                  {lesson.title}
                                  <span className="text-xs text-slate-500">
                                    ({lesson.lessonType})
                                  </span>
                                </span>
                                <span className="text-sm text-slate-400">
                                  {lp?.completed
                                    ? "✓ Done"
                                    : lp
                                      ? `${Math.round(lp.watchPercent)}%`
                                      : "Not started"}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                <Link
                  href={`/trainee/courses/${en.courseId}/player`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm hover:bg-blue-500"
                >
                  <Play className="h-4 w-4" />
                  Continue Learning
                </Link>
              </div>
            </details>
          );
        })}
      </div>

      {enrollments.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No courses enrolled</h3>
          <p className="mt-2 text-slate-400">You have not been assigned any courses yet.</p>
        </div>
      )}
    </div>
  );
}
