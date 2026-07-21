import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardCheck, FileText, FolderKanban, HelpCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CourseManager } from "@/components/courses/CourseManager";
import { QuizQuestionManager } from "@/components/admin/QuizQuestionManager";

export default async function AdminContentPage() {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) redirect("/");

  const [courses, quizzes] = await Promise.all([
    prisma.course.findMany({
      include: {
        modules: {
          include: {
            _count: { select: { lessons: true } },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            enrollments: { where: { user: { active: true } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quiz.findMany({
      where: {
        lesson: { module: { course: { published: true } } },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        lesson: {
          select: {
            title: true,
            module: {
              select: {
                title: true,
                course: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const publishedCourses = courses.filter((c) => c.published);
  const moduleCount = publishedCourses.reduce((total, course) => total + course.modules.length, 0);
  const lessonCount = publishedCourses.reduce(
    (total, course) => total + course.modules.reduce((sum, module) => sum + module._count.lessons, 0),
    0
  );
  const questionCount = quizzes.reduce((total, quiz) => total + quiz.questions.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Content Studio</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Build training, lessons, and certification quizzes</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            This is the admin workspace for managing the learning content employees complete before certification.
          </p>
        </div>
        <Link
          href="/admin/courses"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Advanced Course View
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Published Programs", value: publishedCourses.length, icon: FolderKanban },
          { label: "Modules", value: moduleCount, icon: BookOpen },
          { label: "Lessons", value: lessonCount, icon: FileText },
          { label: "Quiz Questions", value: questionCount, icon: HelpCircle },
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Training Programs</h2>
            <p className="mt-1 text-sm text-slate-400">
              Create publishable programs, then open Manage Content to add modules, lessons, videos, PDFs, SOPs, PPRTs, quizzes, and assignments.
            </p>
          </div>
          <ClipboardCheck className="hidden h-8 w-8 text-blue-300 md:block" />
        </div>
        <div className="mt-5">
          <CourseManager courses={courses} basePath="/admin" />
        </div>
      </section>

      <QuizQuestionManager quizzes={quizzes} />
    </div>
  );
}
