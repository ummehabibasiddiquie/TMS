"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Video,
  FileText,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Pencil,
  Upload,
  Download,
} from "lucide-react";
import { QUIZ_IMPORT_FORMAT_GUIDE } from "@/lib/quiz-import";

type Topic = {
  id: string;
  title: string;
  contentType: string;
  contentUrl: string | null;
  contentBody: string | null;
  durationSec: number | null;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string;
  correct: string;
  order: number;
};

type LessonQuiz = {
  id: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

type Lesson = {
  id: string;
  title: string;
  lessonType: string;
  description: string | null;
  durationMin: number | null;
  topics: Topic[];
  quizzes: LessonQuiz[];
  assignment: { id: string; title: string } | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  modules: Module[];
};

const CONTENT_TYPES = [
  { value: "VIDEO", label: "Video", icon: Video, hint: "Paste YouTube embed URL (e.g. https://www.youtube.com/embed/VIDEO_ID)" },
  { value: "PDF", label: "PDF Document", icon: FileText, hint: "Paste link to PDF file (SharePoint, Google Drive, or hosted URL)" },
  { value: "SOP", label: "SOP", icon: BookOpen, hint: "Standard Operating Procedure text" },
  { value: "PPRT", label: "PPRT", icon: ClipboardList, hint: "Project Process Reference Template text" },
  { value: "DOCUMENT", label: "Document", icon: FileText, hint: "General document / reading material" },
];

function parseOptions(options: string) {
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function CourseContentEditor({
  course,
  basePath,
}: {
  course: Course;
  basePath: "/trainer" | "/admin";
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  async function api(method: string, url: string, body?: object) {
    setLoading(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Request failed");
      return false;
    }
    router.refresh();
    return true;
  }

  async function addModule() {
    const title = prompt("Module title:");
    if (!title?.trim()) return;
    await api("POST", "/api/modules", { courseId: course.id, title });
  }

  async function addLesson(moduleId: string) {
    const title = prompt("Lesson title:");
    if (!title?.trim()) return;
    await api("POST", "/api/lessons", {
      moduleId,
      title,
      lessonType: "CONTENT",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`${basePath}/courses`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to courses
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>
          <p className="text-slate-400">
            Add modules, lessons, content, and quizzes for each lesson
          </p>
        </div>
        <button
          onClick={addModule}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      </div>

      <div className="glass-panel border-blue-500/30 p-4 text-sm text-slate-300">
        <p className="font-medium text-blue-300">How to build a lesson</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-slate-400">
          <li>
            Create a <strong className="text-slate-300">Module</strong>, then add a{" "}
            <strong className="text-slate-300">Lesson</strong>
          </li>
          <li>
            Click <strong className="text-slate-300">Add content</strong> for videos, PDFs, SOP, PPRT
          </li>
          <li>
            Click <strong className="text-slate-300">Add Quiz</strong> on any lesson
            (optional — each lesson can have its own quiz, or none). Quizzes unlock only
            after that lesson&apos;s content is completed.
          </li>
        </ol>
      </div>

      {course.modules.length === 0 && (
        <p className="text-center text-slate-500">No modules yet. Click Add Module to start.</p>
      )}

      {course.modules.map((mod, mi) => (
        <div key={mod.id} className="glass-panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-800/30 px-5 py-4">
            <button onClick={() => toggle(mod.id)} className="text-slate-400">
              {expanded.has(mod.id) ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            <span className="text-xs font-medium text-blue-400">Module {mi + 1}</span>
            <ModuleTitleEditor
              module={mod}
              onSave={(title) => api("PATCH", `/api/modules/${mod.id}`, { title })}
              onDelete={() => {
                if (confirm(`Delete module "${mod.title}" and all its lessons?`)) {
                  api("DELETE", `/api/modules/${mod.id}`);
                }
              }}
            />
            <button
              onClick={() => addLesson(mod.id)}
              disabled={loading}
              className="ml-auto flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs hover:bg-slate-600"
            >
              <Plus className="h-3 w-3" />
              Add Lesson
            </button>
          </div>

          {expanded.has(mod.id) && (
            <div className="space-y-4 p-5">
              {mod.lessons.length === 0 && (
                <p className="text-sm text-slate-500">No lessons in this module.</p>
              )}
              {mod.lessons.map((lesson, li) => (
                <LessonBlock
                  key={lesson.id}
                  lesson={lesson}
                  index={li}
                  loading={loading}
                  onApi={api}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ModuleTitleEditor({
  module,
  onSave,
  onDelete,
}: {
  module: Module;
  onSave: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module.title);

  return (
    <div className="flex flex-1 items-center gap-2">
      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-sm"
          />
          <button
            onClick={() => {
              onSave(title);
              setEditing(false);
            }}
            className="text-xs text-blue-400"
          >
            Save
          </button>
        </>
      ) : (
        <>
          <h3 className="flex-1 font-semibold">{module.title}</h3>
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-white">
            Edit
          </button>
        </>
      )}
      <button onClick={onDelete} className="text-red-400 hover:text-red-300">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function LessonBlock({
  lesson,
  index,
  loading,
  onApi,
}: {
  lesson: Lesson;
  index: number;
  loading: boolean;
  onApi: (method: string, url: string, body?: object) => Promise<boolean>;
}) {
  const quizzes = lesson.quizzes ?? [];
  const [showAddContent, setShowAddContent] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(
    quizzes[0]?.id ?? null
  );
  const [contentForm, setContentForm] = useState({
    title: "",
    contentType: "VIDEO",
    contentUrl: "",
    contentBody: "",
  });

  const typeInfo = CONTENT_TYPES.find((t) => t.value === contentForm.contentType);
  const needsUrl = ["VIDEO", "PDF"].includes(contentForm.contentType);
  const needsBody = ["SOP", "PPRT", "DOCUMENT"].includes(contentForm.contentType);

  async function addContent() {
    if (!contentForm.title.trim()) {
      alert("Content title is required");
      return;
    }
    const ok = await onApi("POST", "/api/topics", {
      lessonId: lesson.id,
      ...contentForm,
    });
    if (ok) {
      setContentForm({ title: "", contentType: "VIDEO", contentUrl: "", contentBody: "" });
      setShowAddContent(false);
    }
  }

  async function createQuiz() {
    const n = quizzes.length + 1;
    const title = prompt("Quiz title:", `${lesson.title} Quiz ${n}`);
    if (title === null) return;
    const passing = prompt("Passing score (%):", "70");
    const passingScore = Number(passing);
    const ok = await onApi("POST", "/api/quiz", {
      lessonId: lesson.id,
      title: title.trim() || `${lesson.title} Quiz ${n}`,
      passingScore: Number.isFinite(passingScore) ? passingScore : 70,
    });
    if (ok) setActiveQuizId(null);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/20 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-slate-500">Lesson {index + 1}</span>
          <p className="font-medium">{lesson.title}</p>
        </div>
        <button
          onClick={() => {
            if (confirm(`Delete lesson "${lesson.title}"?`)) {
              onApi("DELETE", `/api/lessons/${lesson.id}`);
            }
          }}
          className="text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Content section — always available */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content</p>
        {lesson.topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} onApi={onApi} />
        ))}

        {!showAddContent ? (
          <button
            onClick={() => setShowAddContent(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400 hover:border-blue-500 hover:text-blue-300"
          >
            <Plus className="h-4 w-4" />
            Add content (video, PDF, SOP, PPRT…)
          </button>
        ) : (
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 p-4 space-y-3">
            <p className="text-sm font-medium text-blue-300">New content item</p>
            <div>
              <label className="text-xs text-slate-500">Content title *</label>
              <input
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                placeholder="e.g. REX SOP Document"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Content type *</label>
              <select
                value={contentForm.contentType}
                onChange={(e) =>
                  setContentForm({ ...contentForm, contentType: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {typeInfo && <p className="mt-1 text-xs text-slate-500">{typeInfo.hint}</p>}
            </div>
            {needsUrl && (
              <div>
                <label className="text-xs text-slate-500">URL *</label>
                <input
                  value={contentForm.contentUrl}
                  onChange={(e) =>
                    setContentForm({ ...contentForm, contentUrl: e.target.value })
                  }
                  placeholder={
                    contentForm.contentType === "VIDEO"
                      ? "https://www.youtube.com/embed/..."
                      : "https://...pdf"
                  }
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            )}
            {needsBody && (
              <div>
                <label className="text-xs text-slate-500">Content text *</label>
                <textarea
                  value={contentForm.contentBody}
                  onChange={(e) =>
                    setContentForm({ ...contentForm, contentBody: e.target.value })
                  }
                  rows={6}
                  placeholder="Paste SOP / PPRT / document content here…"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-mono"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={addContent}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500"
              >
                Save content
              </button>
              <button
                onClick={() => setShowAddContent(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quizzes — multiple allowed per lesson */}
      <div className="space-y-3 border-t border-slate-700/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quizzes ({quizzes.length})
          </p>
          <button
            onClick={createQuiz}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Add Quiz
          </button>
        </div>

        {quizzes.length === 0 ? (
          <p className="text-xs text-slate-500">No quizzes yet. Add one or more quizzes for this lesson.</p>
        ) : (
          <div className="space-y-2">
            {quizzes.map((quiz, qi) => (
              <div
                key={quiz.id}
                className="rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuizId((id) => (id === quiz.id ? null : quiz.id))
                    }
                    className="min-w-0 flex-1 text-left text-sm text-slate-300"
                  >
                    <span className="font-medium text-purple-200">
                      {qi + 1}. {quiz.title}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      · Pass {quiz.passingScore}% · {quiz.questions.length} question
                      {quiz.questions.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setActiveQuizId((id) => (id === quiz.id ? null : quiz.id))
                      }
                      className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      {activeQuizId === quiz.id ? "Hide" : "Manage"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete quiz "${quiz.title}" and all its questions?`)) {
                          onApi("DELETE", `/api/quiz/${quiz.id}`);
                          if (activeQuizId === quiz.id) setActiveQuizId(null);
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                      title="Delete quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {activeQuizId === quiz.id && (
                  <div className="mt-3">
                    <QuizQuestionsEditor quiz={quiz} loading={loading} onApi={onApi} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizQuestionsEditor({
  quiz,
  loading,
  onApi,
}: {
  quiz: LessonQuiz;
  loading: boolean;
  onApi: (method: string, url: string, body?: object) => Promise<boolean>;
}) {
  const [questionForm, setQuestionForm] = useState({
    question: "",
    optionsText: "Option A\nOption B\nOption C\nOption D",
    correct: "Option A",
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveQuestion() {
    const options = questionForm.optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    if (!questionForm.question.trim() || options.length < 2 || !questionForm.correct.trim()) {
      alert("Question, at least 2 options, and correct answer are required.");
      return;
    }
    if (!options.includes(questionForm.correct.trim())) {
      alert("Correct answer must match one of the options exactly.");
      return;
    }

    const isNew = !editingQuestionId || editingQuestionId === "new";
    const ok = await onApi(
      isNew ? "POST" : "PATCH",
      isNew ? "/api/quiz/questions" : `/api/quiz/questions/${editingQuestionId}`,
      isNew
        ? {
            quizId: quiz.id,
            question: questionForm.question,
            options,
            correct: questionForm.correct.trim(),
          }
        : {
            question: questionForm.question,
            options,
            correct: questionForm.correct.trim(),
          }
    );

    if (ok) {
      setEditingQuestionId(null);
      setQuestionForm({
        question: "",
        optionsText: "Option A\nOption B\nOption C\nOption D",
        correct: "Option A",
      });
    }
  }

  function downloadTemplate(format: "csv" | "xlsx" = "csv") {
    window.open(`/api/quiz/import-template?format=${format}`, "_blank");
  }

  async function importQuestions(file: File) {
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/quiz/${quiz.id}/import`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        const details =
          Array.isArray(data.details) && data.details.length
            ? `\n${data.details.slice(0, 5).join("\n")}`
            : "";
        alert((data.error || "Import failed") + details);
        return;
      }

      const warning =
        Array.isArray(data.skippedErrors) && data.skippedErrors.length
          ? `\n${data.skippedErrors.length} row(s) skipped.`
          : "";
      alert(`Imported ${data.imported} question(s).${warning}`);
      await onApi("PATCH", `/api/quiz/${quiz.id}`, {
        title: quiz.title,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to import file. Please try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-purple-500/30 bg-slate-900/50 p-4">
      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">{QUIZ_IMPORT_FORMAT_GUIDE.title}</p>
        <p className="mt-2 text-slate-300">
          Required columns:{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-purple-200">
            {QUIZ_IMPORT_FORMAT_GUIDE.requiredColumns.join(", ")}
          </code>
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {QUIZ_IMPORT_FORMAT_GUIDE.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadTemplate("csv")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV template
        </button>
        <button
          type="button"
          onClick={() => downloadTemplate("xlsx")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          Download Excel template
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {importing ? "Importing..." : "Upload Excel / CSV"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importQuestions(file);
          }}
        />
      </div>

      {quiz.questions.map((q, qi) => {
        const options = parseOptions(q.options);
        return (
          <div
            key={q.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2"
          >
            <div>
              <p className="text-sm text-white">
                {qi + 1}. {q.question}
              </p>
              <p className="mt-1 text-xs text-slate-500">Options: {options.join(" · ")}</p>
              <p className="text-xs text-emerald-400">Correct: {q.correct}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingQuestionId(q.id);
                  setQuestionForm({
                    question: q.question,
                    optionsText: options.join("\n"),
                    correct: q.correct,
                  });
                }}
                className="text-slate-400 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this question?")) {
                    onApi("DELETE", `/api/quiz/questions/${q.id}`);
                  }
                }}
                className="text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {editingQuestionId ? (
        <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
          <p className="text-sm font-medium text-blue-300">
            {editingQuestionId === "new" ? "New question" : "Edit question"}
          </p>
          <div>
            <label className="text-xs text-slate-500">Question *</label>
            <input
              value={questionForm.question}
              onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Options (one per line) *</label>
            <textarea
              value={questionForm.optionsText}
              onChange={(e) =>
                setQuestionForm({ ...questionForm, optionsText: e.target.value })
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Correct answer *</label>
            <select
              value={questionForm.correct}
              onChange={(e) => setQuestionForm({ ...questionForm, correct: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            >
              {questionForm.optionsText
                .split("\n")
                .map((o) => o.trim())
                .filter(Boolean)
                .map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveQuestion}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500"
            >
              Save question
            </button>
            <button
              onClick={() => setEditingQuestionId(null)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingQuestionId("new");
            setQuestionForm({
              question: "",
              optionsText: "Option A\nOption B\nOption C\nOption D",
              correct: "Option A",
            });
          }}
          className="flex items-center gap-2 rounded-lg border border-dashed border-purple-500/40 px-4 py-3 text-sm text-purple-300 hover:border-purple-400"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  onApi,
}: {
  topic: Topic;
  onApi: (method: string, url: string, body?: object) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: topic.title,
    contentType: topic.contentType,
    contentUrl: topic.contentUrl ?? "",
    contentBody: topic.contentBody ?? "",
  });

  const Icon = CONTENT_TYPES.find((t) => t.value === topic.contentType)?.icon ?? FileText;
  const needsUrl = ["VIDEO", "PDF"].includes(topic.contentType);

  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      {!editing ? (
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{topic.title}</p>
            <p className="text-xs text-slate-500">{topic.contentType}</p>
            {topic.contentUrl && (
              <p className="mt-1 truncate text-xs text-blue-400">{topic.contentUrl}</p>
            )}
            {topic.contentBody && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{topic.contentBody}</p>
            )}
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-white">
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this content?")) onApi("DELETE", `/api/topics/${topic.id}`);
            }}
            className="text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
          />
          <select
            value={form.contentType}
            onChange={(e) => setForm({ ...form, contentType: e.target.value })}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {needsUrl && (
            <input
              value={form.contentUrl}
              onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
              placeholder="URL"
            />
          )}
          {!needsUrl && (
            <textarea
              value={form.contentBody}
              onChange={(e) => setForm({ ...form, contentBody: e.target.value })}
              rows={4}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onApi("PATCH", `/api/topics/${topic.id}`, form);
                setEditing(false);
              }}
              className="text-xs text-blue-400"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
