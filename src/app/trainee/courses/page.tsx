import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { ChevronDown, Play } from "lucide-react";

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
      <h1 className="text-3xl font-bold">My Courses</h1>
      <div className="space-y-6">
        {enrollments.map((en) => (
          <details key={en.id} className="glass-panel group overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center gap-6 p-6 [&::-webkit-details-marker]:hidden">
              <ProgressRing percent={en.progressPercent} size={80} />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{en.course.title}</h3>
                <p className="text-sm text-slate-400">{en.course.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Status: {en.status.replace("_", " ")}
                </p>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-700 px-6 pb-6">
              {en.course.modules.map((mod) => (
                <div key={mod.id} className="mt-4">
                  <h4 className="mb-2 font-medium text-blue-300">{mod.title}</h4>
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
              ))}
              <Link
                href={`/trainee/courses/${en.courseId}/player`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm hover:bg-blue-500"
              >
                <Play className="h-4 w-4" />
                Open Course Player
              </Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
