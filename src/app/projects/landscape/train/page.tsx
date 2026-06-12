import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, AlertTriangle, Check, Minus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { landscapeModules } from "@/lib/onboarding-data";
import { prisma } from "@/lib/db";

// Note: This page is kept for backward compatibility with the Landscape training content
// The training modules are now managed through the Course system

export default async function LandscapeTrainingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const landscapeCourse = await prisma.course.findFirst({
    where: { title: { contains: "Landscape" } },
    include: {
      modules: {
        include: {
          lessons: {
            include: { topics: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  const dbModules = landscapeCourse?.modules.map((module) => ({
    title: module.title,
    summary: module.description || `${module.lessons.length} lessons`,
    subTypes: module.lessons.map((lesson) => lesson.title).join(", ") || "General guidelines",
    include: module.lessons.flatMap((lesson) =>
      lesson.topics
        .filter((topic) => ["SOP", "PPRT", "DOCUMENT"].includes(topic.contentType))
        .map((topic) => topic.title)
    ),
    exclude: [],
    mistakes: [],
    tips: module.lessons
      .flatMap((lesson) => lesson.topics)
      .map((topic) => topic.contentBody || topic.contentUrl || "")
      .filter(Boolean)
      .slice(0, 2),
  }));
  const modules = dbModules?.length ? dbModules : landscapeModules;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              Landscape - Annotation Training
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">Study all 9 annotation classes</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Expand each class to read the full guidelines. All modules should be read before taking the quiz.
            </p>
          </div>
          <p className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
            3 of 9 modules read
          </p>
        </div>

        <div className="space-y-3">
              {modules.map((module, index) => (
            <details
              key={module.title}
              open={index === 0}
              className="group rounded-lg border border-slate-800 bg-slate-900 p-5"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                  {module.title[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{module.title}</span>
                  <span className="block text-sm text-slate-500">{module.summary}</span>
                </span>
                <span className="text-slate-500 group-open:rotate-90">›</span>
              </summary>

                <div className="mt-5 grid gap-4 border-t border-slate-800 pt-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sub-types</p>
                  <p className="mt-2 text-sm text-slate-300">{module.subTypes}</p>
                </div>
                <div className="space-y-3">
                  {module.include.map((item) => (
                    <p key={item} className="flex gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      {item}
                    </p>
                  ))}
                  {module.exclude.map((item) => (
                    <p key={item} className="flex gap-2 text-sm text-slate-300">
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      {item}
                    </p>
                  ))}
                </div>
                <div className="space-y-3">
                  {module.mistakes.map((item) => (
                    <p key={item} className="flex gap-2 text-sm text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {item}
                    </p>
                  ))}
                  {module.tips.map((item) => (
                    <p key={item} className="text-sm text-slate-400">{item}</p>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>

        <Link
          href="/projects/landscape/quiz"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Take Certification Quiz
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </AppShell>
  );
}
