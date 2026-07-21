"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MessageSquare,
  FileText,
  StickyNote,
  BarChart2,
} from "lucide-react";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { LessonQuizExam } from "@/components/learning/LessonQuizExam";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  title: string;
  contentType: string;
  contentUrl: string | null;
  contentBody: string | null;
};

type Question = {
  id: string;
  question: string;
  options: string;
  correct: string;
};

type LessonQuiz = {
  id: string;
  title: string;
  passingScore: number;
  questions: Question[];
};

type Lesson = {
  id: string;
  title: string;
  lessonType: string;
  moduleTitle?: string;
  topics: Topic[];
  quizzes?: LessonQuiz[];
  assignment?: { id: string; title: string; instructions: string | null } | null;
};

type Props = {
  course: { id: string; title: string; modules: { id: string; title: string; lessons: Lesson[] }[] };
  lessons: Lesson[];
  activeLessonId?: string;
  progress: { lessonId: string; completed: boolean; watchPercent: number; quizPassed?: boolean }[];
  passedQuizIds?: string[];
  initialNote: string;
  discussions: { id: string; content: string; user: { name: string }; createdAt: Date }[];
  enrollmentPercent: number;
  userId: string;
};

export function CoursePlayer({
  course,
  lessons,
  activeLessonId,
  progress,
  passedQuizIds: initialPassedQuizIds = [],
  initialNote,
  discussions: initialDiscussions,
  enrollmentPercent,
}: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(activeLessonId ?? lessons[0]?.id);
  const [localProgress, setLocalProgress] = useState(
    Object.fromEntries(progress.map((p) => [p.lessonId, p]))
  );
  const [coursePercent, setCoursePercent] = useState(enrollmentPercent);
  const [note, setNote] = useState(initialNote);
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [newComment, setNewComment] = useState("");
  const [quizResults, setQuizResults] = useState<
    Record<string, { score: number; passed: boolean }>
  >({});
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(
    () => new Set(initialPassedQuizIds)
  );
  const [rightTab, setRightTab] = useState<"notes" | "progress" | "resources" | "discussion">("notes");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );

  const activeLesson = lessons.find((l) => l.id === activeId);
  const activeIndex = lessons.findIndex((l) => l.id === activeId);
  const prevLesson = lessons[activeIndex - 1];
  const nextLesson = lessons[activeIndex + 1];
  const lessonQuizzes = activeLesson?.quizzes ?? [];

  const updateProgress = useCallback(
    async (data: Record<string, unknown>) => {
      if (!activeLesson) return;
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: activeLesson.id,
          courseId: course.id,
          ...data,
        }),
      });
      const json = await res.json();
      if (json.progress) {
        setLocalProgress((prev) => ({
          ...prev,
          [activeLesson.id]: { ...prev[activeLesson.id], ...json.progress },
        }));
      }
      if (json.courseProgress !== undefined) setCoursePercent(json.courseProgress);
      router.refresh();
    },
    [activeLesson, course.id, router]
  );

  async function markComplete() {
    if (!activeLesson) return;
    const quizzes = activeLesson.quizzes ?? [];
    const allPassed =
      quizzes.length === 0 || quizzes.every((q) => passedQuizIds.has(q.id));
    // Content + quizzes: first mark content done (unlock quizzes). Stay on lesson for the quiz.
    if (quizzes.length > 0 && !allPassed) {
      await updateProgress({ completed: false, watchPercent: 100 });
      return;
    }
    await updateProgress({ completed: true, watchPercent: 100 });
    // Fully done — move to the next lesson (or back to courses if this was the last)
    if (nextLesson) {
      navigateLesson(nextLesson.id);
    } else {
      router.push("/trainee/training");
    }
  }

  async function saveNote() {
    if (!activeLesson) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: activeLesson.id, content: note }),
    });
  }

  async function postComment() {
    if (!activeLesson || !newComment.trim()) return;
    const res = await fetch("/api/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: activeLesson.id, content: newComment }),
    });
    const { comment } = await res.json();
    setDiscussions((d) => [comment, ...d]);
    setNewComment("");
  }

  async function submitQuiz(quizId: string, answers: Record<string, string>) {
    if (!activeLesson) return;
    setSubmittingQuizId(quizId);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || `Quiz submit failed (${res.status}). Please try again.`);
        return;
      }
      setQuizResults((prev) => ({
        ...prev,
        [quizId]: { score: data.score, passed: data.passed },
      }));
      if (Array.isArray(data.passedQuizIds)) {
        setPassedQuizIds(new Set(data.passedQuizIds));
      } else if (data.passed) {
        setPassedQuizIds((prev) => new Set([...prev, quizId]));
      }
      setLocalProgress((prev) => ({
        ...prev,
        [activeLesson.id]: {
          ...prev[activeLesson.id],
          lessonId: activeLesson.id,
          watchPercent: prev[activeLesson.id]?.watchPercent ?? 100,
          quizPassed: Boolean(data.allPassed),
          completed: Boolean(data.allPassed),
        },
      }));
      if (data.courseProgress !== undefined) setCoursePercent(data.courseProgress);
      if (data.allPassed) {
        if (nextLesson) {
          navigateLesson(nextLesson.id);
        } else {
          router.push("/trainee/training");
        }
        return;
      }
      router.refresh();
    } finally {
      setSubmittingQuizId(null);
    }
  }

  function navigateLesson(id: string) {
    setActiveId(id);
    router.push(`/trainee/courses/${course.id}/player?lesson=${id}`);
  }

  if (!activeLesson) return <p>No lessons in this course.</p>;

  const lp = localProgress[activeLesson.id];
  // Only quizzes attached to THIS lesson (other lessons' quizzes never show here)
  const hasQuiz = lessonQuizzes.length > 0;
  const allQuizzesPassed =
    !hasQuiz || lessonQuizzes.every((q) => passedQuizIds.has(q.id));
  // Unlock only when THIS lesson's content is done — not because another lesson was completed
  const contentDone =
    activeLesson.lessonType === "QUIZ" || (lp?.watchPercent ?? 0) >= 90;
  const quizUnlocked =
    hasQuiz && (activeLesson.lessonType === "QUIZ" || contentDone);
  const markLabel =
    hasQuiz && !allQuizzesPassed
      ? contentDone
        ? `Complete ${lessonQuizzes.length} quiz${lessonQuizzes.length !== 1 ? "zes" : ""} below`
        : "Mark Content Complete"
      : "Mark Complete";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/trainee/training" className="text-sm text-slate-400 hover:text-white">
          ← Today&apos;s Work
        </Link>
        <h1 className="text-lg font-semibold">{course.title}</h1>
        <ProgressRing percent={coursePercent} size={56} />
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Module navigation */}
        <aside className="glass-panel w-64 shrink-0 overflow-y-auto p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Curriculum
          </h3>
          {course.modules.map((mod) => (
            <div key={mod.id} className="mb-2">
              <button
                onClick={() => {
                  const next = new Set(expandedModules);
                  if (next.has(mod.id)) next.delete(mod.id);
                  else next.add(mod.id);
                  setExpandedModules(next);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-slate-800/50"
              >
                {mod.title}
                <span className="text-xs text-slate-500">
                  {expandedModules.has(mod.id) ? "−" : "+"}
                </span>
              </button>
              {expandedModules.has(mod.id) && (
                <ul className="ml-2 space-y-1 border-l border-slate-700 pl-2">
                  {mod.lessons.map((lesson) => {
                    const p = localProgress[lesson.id];
                    return (
                      <li key={lesson.id}>
                        <button
                          onClick={() => navigateLesson(lesson.id)}
                          className={cn(
                            "w-full rounded-lg px-2 py-2 text-left text-xs transition",
                            activeId === lesson.id
                              ? "bg-blue-600/30 text-blue-200"
                              : "text-slate-400 hover:bg-slate-800/50"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {p?.completed && (
                              <Check className="h-3 w-3 text-emerald-400" />
                            )}
                            {lesson.title}
                            {(lesson.quizzes?.length ?? 0) > 0 && (
                              <span className="ml-auto rounded bg-violet-600/20 px-1 text-[10px] text-violet-300">
                                {lesson.quizzes!.length > 1
                                  ? `${lesson.quizzes!.length} Quizzes`
                                  : "Quiz"}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </aside>

        {/* Center: Content */}
        <div className="glass-panel flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
            <p className="text-sm text-slate-500">{activeLesson.moduleTitle}</p>

            {activeLesson.lessonType === "ASSIGNMENT" && activeLesson.assignment && (
              <div className="mt-6 rounded-xl bg-slate-800/40 p-6">
                <h3 className="font-semibold">{activeLesson.assignment.title}</h3>
                <p className="mt-2 text-slate-400">
                  {activeLesson.assignment.instructions}
                </p>
                <button
                  onClick={() => updateProgress({ assignmentDone: true, completed: true })}
                  className="mt-4 rounded-xl bg-blue-600 px-6 py-2"
                >
                  Mark Assignment Complete
                </button>
              </div>
            )}

            {(activeLesson.lessonType === "CONTENT" ||
              (activeLesson.lessonType !== "QUIZ" &&
                activeLesson.lessonType !== "ASSIGNMENT")) && (
              <div className="mt-6 space-y-6">
                {activeLesson.topics.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {hasQuiz
                      ? "Review this lesson, then mark content complete to unlock the quiz."
                      : "No content topics yet."}
                  </p>
                ) : (
                  activeLesson.topics.map((topic) => (
                    <div key={topic.id}>
                      {topic.contentType === "VIDEO" && topic.contentUrl && (
                        <div className="aspect-video overflow-hidden rounded-xl bg-black">
                          <iframe
                            src={topic.contentUrl}
                            className="h-full w-full"
                            allowFullScreen
                            title={topic.title}
                          />
                        </div>
                      )}
                      {(topic.contentType === "PDF" ||
                        topic.contentType === "SOP" ||
                        topic.contentType === "PPRT" ||
                        topic.contentType === "DOCUMENT" ||
                        topic.contentType === "TEXT") && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
                          <span className="mb-2 inline-block rounded bg-blue-600/20 px-2 py-0.5 text-xs text-blue-300">
                            {topic.contentType}
                          </span>
                          <h3 className="text-lg font-semibold">{topic.title}</h3>
                          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm text-slate-300">
                            {topic.contentBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {activeLesson.topics.some((t) => t.contentType === "VIDEO") && (
                  <div>
                    <label className="text-sm text-slate-400">Video progress</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lp?.watchPercent ?? 0}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setLocalProgress((prev) => ({
                          ...prev,
                          [activeLesson.id]: {
                            ...prev[activeLesson.id],
                            lessonId: activeLesson.id,
                            watchPercent: v,
                            completed: prev[activeLesson.id]?.completed ?? false,
                          },
                        }));
                      }}
                      onMouseUp={(e) =>
                        updateProgress({
                          watchPercent: parseInt((e.target as HTMLInputElement).value),
                          timeSpentSec: 60,
                        })
                      }
                      className="mt-2 w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {hasQuiz && !quizUnlocked && (
              <div className="mt-8 rounded-xl border border-dashed border-violet-500/40 bg-violet-950/20 p-6 text-center">
                <p className="font-medium text-violet-200">
                  {lessonQuizzes.length > 1 ? "Quizzes locked" : "Quiz locked"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Finish <span className="text-slate-200">{activeLesson.title}</span>{" "}
                  content first. Only this lesson&apos;s quiz unlocks here — not
                  quizzes from other lessons.
                </p>
              </div>
            )}

            {quizUnlocked && (
              <div className="mt-8 space-y-6 border-t border-slate-700 pt-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lesson quiz
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Complete each quiz for this lesson. Questions appear one at a time.
                  </p>
                </div>
                {lessonQuizzes.map((quiz, qi) => {
                  const passed = passedQuizIds.has(quiz.id);
                  const result = quizResults[quiz.id] ?? null;
                  return (
                    <LessonQuizExam
                      key={quiz.id}
                      quiz={quiz}
                      indexLabel={`Quiz ${qi + 1} of ${lessonQuizzes.length}`}
                      passed={passed}
                      result={result}
                      submitting={submittingQuizId === quiz.id}
                      onSubmit={submitQuiz}
                      onRetake={() => {
                        setQuizResults((prev) => {
                          const next = { ...prev };
                          delete next[quiz.id];
                          return next;
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-slate-700 px-6 py-4">
            <button
              disabled={!prevLesson}
              onClick={() => prevLesson && navigateLesson(prevLesson.id)}
              className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={markComplete}
              disabled={hasQuiz && contentDone && !allQuizzesPassed}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {markLabel}
            </button>
            <button
              disabled={!nextLesson}
              onClick={() => nextLesson && navigateLesson(nextLesson.id)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right panel */}
        <aside className="glass-panel flex w-80 shrink-0 flex-col">
          <div className="flex border-b border-slate-700">
            {(
              [
                ["notes", StickyNote, "Notes"],
                ["progress", BarChart2, "Progress"],
                ["resources", FileText, "Resources"],
                ["discussion", MessageSquare, "Chat"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setRightTab(key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
                  rightTab === key ? "border-b-2 border-blue-500 text-blue-300" : "text-slate-500"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === "notes" && (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-40 w-full rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-sm"
                  placeholder="Take notes..."
                />
                <button
                  onClick={saveNote}
                  className="mt-2 w-full rounded-xl bg-slate-700 py-2 text-sm hover:bg-slate-600"
                >
                  Save Notes
                </button>
              </>
            )}
            {rightTab === "progress" && (
              <div className="space-y-4 text-sm">
                <div className="flex justify-center">
                  <ProgressRing percent={coursePercent} size={100} label="Course" />
                </div>
                <p>
                  This lesson: {Math.round(lp?.watchPercent ?? 0)}% watched
                </p>
                <p>Status: {lp?.completed ? "Completed" : "In progress"}</p>
              </div>
            )}
            {rightTab === "resources" && (
              <ul className="space-y-2 text-sm">
                {activeLesson.topics.map((t) => (
                  <li key={t.id} className="rounded-lg bg-slate-800/40 px-3 py-2">
                    {t.title} ({t.contentType})
                  </li>
                ))}
              </ul>
            )}
            {rightTab === "discussion" && (
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-2 text-sm"
                  placeholder="Add a comment..."
                  rows={2}
                />
                <button
                  onClick={postComment}
                  className="w-full rounded-xl bg-blue-600 py-2 text-sm"
                >
                  Post
                </button>
                {discussions.map((d) => (
                  <div key={d.id} className="rounded-lg bg-slate-800/40 p-3 text-sm">
                    <p className="font-medium text-blue-300">{d.user.name}</p>
                    <p className="text-slate-300">{d.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
