"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  StickyNote,
  BarChart2,
  Loader2,
} from "lucide-react";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { LessonQuizExam } from "@/components/learning/LessonQuizExam";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/upload-files";

function isUploadedOrDirectMedia(url: string) {
  return /\.(mp4|webm|ogg|mov|avi)(\?|#|$)/i.test(url);
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|#|$)/i.test(url);
}

function UploadedVideoPlayer({ url, title }: { url: string; title: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 text-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm">Loading video…</p>
        </div>
      )}
      {error ? (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-300">
          Video could not be loaded. Try opening the file again or re-upload it.
        </div>
      ) : (
        <video
          src={url}
          controls
          className="h-full w-full"
          title={title}
          onLoadStart={() => {
            setLoading(true);
            setError(false);
          }}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        >
          Your browser does not support video playback.
        </video>
      )}
    </div>
  );
}

function TopicMedia({ topic }: { topic: Topic }) {
  const url = resolveMediaUrl(topic.contentUrl ?? "");

  if (topic.contentType === "VIDEO" && url) {
    if (isUploadedOrDirectMedia(url)) {
      return <UploadedVideoPlayer url={url} title={topic.title} />;
    }
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={url}
          className="h-full w-full"
          allowFullScreen
          title={topic.title}
        />
      </div>
    );
  }

  if (["SOP", "PPRT", "DOCUMENT", "TEXT", "PDF"].includes(topic.contentType)) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6 space-y-4">
        <span className="inline-block rounded bg-blue-600/20 px-2 py-0.5 text-xs text-blue-300">
          {topic.contentType}
        </span>
        {url && (
          <div className="space-y-2">
            {(isPdfUrl(url) || topic.contentType === "PDF") && (
              <iframe
                src={url}
                className="h-[70vh] w-full rounded-lg border border-slate-700 bg-white"
                title={topic.contentType}
              />
            )}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-blue-400 hover:underline"
            >
              Open / download file
            </a>
          </div>
        )}
        {topic.contentBody && (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">
            {topic.contentBody}
          </pre>
        )}
        {!url && !topic.contentBody && (
          <p className="text-sm text-slate-500">No content attached yet.</p>
        )}
      </div>
    );
  }

  return null;
}

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
  initialStep?: "content" | "quiz";
  progress: { lessonId: string; completed: boolean; watchPercent: number; quizPassed?: boolean }[];
  passedQuizIds?: string[];
  initialNote: string;
  enrollmentPercent: number;
};

export function CoursePlayer({
  course,
  lessons,
  activeLessonId,
  initialStep = "content",
  progress,
  passedQuizIds: initialPassedQuizIds = [],
  initialNote,
  enrollmentPercent,
}: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(activeLessonId ?? lessons[0]?.id);
  const [localProgress, setLocalProgress] = useState(
    Object.fromEntries(progress.map((p) => [p.lessonId, p]))
  );
  const [coursePercent, setCoursePercent] = useState(enrollmentPercent);
  const [note, setNote] = useState(initialNote);
  const [quizResults, setQuizResults] = useState<
    Record<string, { score: number; passed: boolean }>
  >({});
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(
    () => new Set(initialPassedQuizIds)
  );
  const [rightTab, setRightTab] = useState<"notes" | "progress" | "resources">("notes");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );

  const [lessonStep, setLessonStep] = useState<"content" | "quiz">(
    initialStep === "quiz" ? "quiz" : "content"
  );

  useEffect(() => {
    if (activeLessonId) setActiveId(activeLessonId);
  }, [activeLessonId]);

  useEffect(() => {
    setLessonStep(initialStep === "quiz" ? "quiz" : "content");
  }, [activeLessonId, initialStep]);

  const activeLesson = lessons.find((l) => l.id === activeId);
  const activeIndex = lessons.findIndex((l) => l.id === activeId);
  const prevLesson = lessons[activeIndex - 1];
  const nextLesson = lessons[activeIndex + 1];
  const lessonQuizzes = activeLesson?.quizzes ?? [];

  const updateProgress = useCallback(
    async (data: Record<string, unknown>, opts?: { skipRefresh?: boolean }) => {
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
      if (!opts?.skipRefresh) router.refresh();
    },
    [activeLesson, course.id, router]
  );

  async function markComplete() {
    if (!activeLesson) return;
    const quizzes = activeLesson.quizzes ?? [];
    const allPassed =
      quizzes.length === 0 || quizzes.every((q) => passedQuizIds.has(q.id));
    if (quizzes.length > 0 && !allPassed) {
      await updateProgress({ completed: false, watchPercent: 100 });
      navigateLesson(activeLesson.id, "quiz");
      return;
    }
    if (nextLesson) {
      navigateLesson(nextLesson.id, "content");
    }
    await updateProgress(
      { completed: true, watchPercent: 100 },
      { skipRefresh: Boolean(nextLesson) }
    );
    if (!nextLesson) {
      router.push("/trainee/training");
    }
  }

  async function markAssignmentComplete() {
    if (!activeLesson) return;
    if (nextLesson) {
      navigateLesson(nextLesson.id, "content");
    }
    await updateProgress(
      { assignmentDone: true, completed: true },
      { skipRefresh: Boolean(nextLesson) }
    );
    if (!nextLesson) {
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
          navigateLesson(nextLesson.id, "content");
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

  function navigateLesson(id: string, step: "content" | "quiz" = "content") {
    setActiveId(id);
    setLessonStep(step);
    const params = new URLSearchParams({ lesson: id });
    if (step === "quiz") params.set("step", "quiz");
    router.push(`/trainee/courses/${course.id}/player?${params.toString()}`);
  }

  function isQuizUnlockedForLesson(lesson: Lesson, prog?: { watchPercent?: number }) {
    const quizzes = lesson.quizzes ?? [];
    if (quizzes.length === 0) return false;
    if (lesson.lessonType === "QUIZ") return true;
    return (prog?.watchPercent ?? 0) > 0;
  }

  if (!activeLesson) return <p>No lessons in this course.</p>;

  const lp = localProgress[activeLesson.id];
  // Only quizzes attached to THIS lesson (other lessons' quizzes never show here)
  const hasQuiz = lessonQuizzes.length > 0;
  const allQuizzesPassed =
    !hasQuiz || lessonQuizzes.every((q) => passedQuizIds.has(q.id));
  // Unlock when lesson type is QUIZ or when user has started watching content
  const contentDone =
    activeLesson.lessonType === "QUIZ" || (lp?.watchPercent ?? 0) >= 90;
  const quizUnlocked =
    hasQuiz && isQuizUnlockedForLesson(activeLesson, lp);
  const showQuizOnly = lessonStep === "quiz" && quizUnlocked && hasQuiz;
  const showContent = !showQuizOnly;

  const markLabel =
    hasQuiz && !allQuizzesPassed
      ? showQuizOnly
        ? "Pass quiz to continue"
        : contentDone
          ? "Continue to quiz"
          : "Mark content complete"
      : "Mark complete";

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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
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
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                {mod.title}
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {expandedModules.has(mod.id) ? "−" : "+"}
                </span>
              </button>
              {expandedModules.has(mod.id) && (
                <ul className="ml-2 space-y-1 border-l border-slate-300 dark:border-slate-700 pl-2">
                  {mod.lessons.map((lesson) => {
                    const p = localProgress[lesson.id];
                    const lessonHasQuiz = (lesson.quizzes?.length ?? 0) > 0;
                    const quizOpen = isQuizUnlockedForLesson(lesson, p);
                    const isActiveContent =
                      activeId === lesson.id && lessonStep === "content";
                    const isActiveQuiz =
                      activeId === lesson.id && lessonStep === "quiz";
                    return (
                      <li key={lesson.id} className="space-y-1">
                        <button
                          onClick={() => navigateLesson(lesson.id, "content")}
                          className={cn(
                            "w-full rounded-lg px-2 py-2 text-left text-xs transition",
                            isActiveContent
                              ? "bg-blue-600/30 text-blue-700 dark:text-blue-200"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {p?.completed && (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {lesson.title}
                          </span>
                        </button>
                        {lessonHasQuiz && (
                          <button
                            type="button"
                            disabled={!quizOpen}
                            onClick={() => navigateLesson(lesson.id, "quiz")}
                            className={cn(
                              "ml-3 w-[calc(100%-0.75rem)] rounded-lg px-2 py-1.5 text-left text-[11px] transition",
                              !quizOpen && "cursor-not-allowed opacity-50",
                              isActiveQuiz
                                ? "bg-violet-600/20 font-medium text-violet-800 dark:text-violet-200"
                                : "text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30"
                            )}
                          >
                            Quiz
                            {lesson.quizzes!.length > 1
                              ? ` (${lesson.quizzes!.length})`
                              : ""}
                          </button>
                        )}
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {showQuizOnly
                ? lessonQuizzes.length > 1
                  ? "Lesson quizzes"
                  : "Lesson quiz"
                : activeLesson.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {showQuizOnly ? activeLesson.title : activeLesson.moduleTitle}
            </p>

            {showContent && activeLesson.lessonType === "ASSIGNMENT" && activeLesson.assignment && (
              <div className="mt-6 rounded-xl bg-slate-800/40 p-6">
                <h3 className="font-semibold">{activeLesson.assignment.title}</h3>
                <p className="mt-2 text-slate-400">
                  {activeLesson.assignment.instructions}
                </p>
                <button
                  onClick={() => void markAssignmentComplete()}
                  className="mt-4 rounded-xl bg-blue-600 px-6 py-2"
                >
                  Mark Assignment Complete
                </button>
              </div>
            )}

            {showContent &&
              (activeLesson.lessonType === "CONTENT" ||
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
                      <TopicMedia topic={topic} />
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

            {showContent && hasQuiz && !quizUnlocked && (
              <div className="mt-8 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-6 text-center dark:border-violet-500/40 dark:bg-violet-950/20">
                <p className="font-semibold text-violet-900 dark:font-medium dark:text-violet-200">
                  {lessonQuizzes.length > 1 ? "Quizzes locked" : "Quiz locked"}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Finish this lesson&apos;s content first, then use{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    Continue to quiz
                  </span>{" "}
                  or open <span className="font-medium">Quiz</span> in the sidebar.
                </p>
              </div>
            )}

            {showQuizOnly && (
              <div className="mt-6 space-y-6">
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
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              disabled={showQuizOnly ? false : !prevLesson}
              onClick={() => {
                if (showQuizOnly) {
                  navigateLesson(activeLesson.id, "content");
                  return;
                }
                if (prevLesson) navigateLesson(prevLesson.id, "content");
              }}
              className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              {showQuizOnly ? "Back to lesson" : "Previous"}
            </button>
            <button
              onClick={markComplete}
              disabled={showQuizOnly}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {markLabel}
            </button>
            <button
              disabled={
                showQuizOnly
                  ? !allQuizzesPassed || !nextLesson
                  : hasQuiz && quizUnlocked && !allQuizzesPassed
                    ? false
                    : !nextLesson
              }
              onClick={() => {
                if (!showQuizOnly && hasQuiz && quizUnlocked && !allQuizzesPassed) {
                  navigateLesson(activeLesson.id, "quiz");
                  return;
                }
                if (nextLesson) navigateLesson(nextLesson.id, "content");
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {showQuizOnly
                ? "Next lesson"
                : hasQuiz && quizUnlocked && !allQuizzesPassed
                  ? "Go to quiz"
                  : "Next"}
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
                  className="mt-2 w-full rounded-xl bg-blue-600 py-2 text-sm text-white hover:bg-blue-500"
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
                    {t.contentType}
                    {t.contentUrl ? " · file attached" : t.contentBody ? " · text" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
