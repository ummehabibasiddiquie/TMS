"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

/** Welcome / orientation — day work lives in Today's Work, not here. */
export function OnboardingGuide() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            How training works
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Your day-by-day path</h2>
          <p className="mt-1 text-sm text-slate-400">
            Daily checklist and lessons are in Today&apos;s Work. This page is only a short guide.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <ol className="space-y-0">
            {[
              {
                title: "Day 1 — Onboarding checklist",
                body: "Induction, documents & signatures, biometrics, KEKA credentials, system assignment, and locker assignment.",
              },
              {
                title: "Day 2+ — Project lessons",
                body: "Each day opens the lessons for that project. Finish today’s items; progress updates for you and your Team Lead.",
              },
              {
                title: "Yesterday preview",
                body: "When you open Today’s Work, you’ll see a short recap of what you completed yesterday.",
              },
              {
                title: "Course Library",
                body: "Reopen lessons you’ve already unlocked anytime — future days stay locked until you reach them.",
              },
            ].map((step, index, arr) => (
              <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                {index < arr.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-slate-700" />
                )}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-sm font-semibold text-blue-300">
                  {index + 1}
                </div>
                <div className="pt-0.5">
                  <p className="font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/trainee/training"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <ClipboardCheck className="h-4 w-4" />
            Start Today&apos;s Work
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/trainee/courses"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <BookOpen className="h-4 w-4 text-blue-300" />
            Course Library
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Why it matters
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Why we train first</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              title: "Learn before you deliver",
              body: "Lessons build the skills you need on real projects, so you are not guessing on client work.",
            },
            {
              title: "Quality starts here",
              body: "Good habits and clear daily goals protect quality. Your lead can see progress clearly.",
            },
            {
              title: "Same clear path",
              body: "Everyone follows a day-wise plan — checklist, then project training — so expectations stay clear.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-4"
            >
              <div className="flex gap-3">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Projects
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">After you learn</h2>
          <p className="mt-1 text-sm text-slate-400">
            Training prepares you through your day-wise schedule. Your Team Lead can review completed days.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
        >
          <FolderKanban className="h-4 w-4 text-blue-300" />
          View projects
        </Link>
      </section>
    </div>
  );
}
