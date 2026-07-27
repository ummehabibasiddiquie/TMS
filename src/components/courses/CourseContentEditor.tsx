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
  Loader2,
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
  {
    value: "VIDEO",
    label: "Video",
    icon: Video,
    hint: "Upload a video file (MP4/WebM) or paste a YouTube/Vimeo embed URL",
  },
  {
    value: "PDF",
    label: "PDF Document",
    icon: FileText,
    hint: "Upload a PDF or paste a link (SharePoint, Drive, or hosted URL)",
  },
  { value: "SOP", label: "SOP", icon: BookOpen, hint: "Standard Operating Procedure text (optional file upload)" },
  {
    value: "PPRT",
    label: "PPRT",
    icon: ClipboardList,
    hint: "Project Process Reference Template text (optional file upload)",
  },
  {
    value: "DOCUMENT",
    label: "Document",
    icon: FileText,
    hint: "Upload a document/PDF or paste text / a link",
  },
];

function acceptForType(contentType: string) {
  if (contentType === "VIDEO") return "video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov";
  if (contentType === "PDF") return "application/pdf,.pdf";
  return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf";
}

function ContentUrlField({
  contentType,
  value,
  onChange,
  onUploadingChange,
}: {
  contentType: string;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  function handleUpload(file: File) {
    setBusy(true);
    setProgress(0);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          setProgress(100);
          onChange(data.url);
        } else {
          setError(data.error || "Upload failed");
        }
      } catch {
        setError("Upload failed");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    };

    xhr.onerror = () => {
      setError("Upload failed — check your connection and try again");
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    };

    xhr.send(formData);
  }

  const isVideo = contentType === "VIDEO";
  const label = isVideo ? "Video file or URL" : "File or URL";

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs ${
            uploading
              ? "cursor-not-allowed border-blue-500/50 bg-blue-950/30 text-blue-200"
              : "cursor-pointer border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-500 hover:text-blue-300"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? "Uploading…" : "Upload file"}</span>
          <input
            ref={inputRef}
            type="file"
            accept={acceptForType(contentType)}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </label>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-slate-500 hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>

      {uploading && (
        <div className="rounded-lg border border-blue-500/40 bg-blue-950/30 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-blue-200">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>
              {isVideo ? "Uploading video…" : "Uploading file…"} {progress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Large files can take a few minutes — please keep this page open.
          </p>
        </div>
      )}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={uploading}
        placeholder={
          isVideo
            ? "Or paste https://www.youtube.com/embed/… or /uploads/…"
            : "Or paste a file URL"
        }
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm disabled:opacity-50"
      />
      {value && !uploading && (
        <p className="truncate text-xs text-emerald-400" title={value}>
          Ready: {value}
        </p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

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

  function save() {
    const next = title.trim();
    if (!next) {
      alert("Module title is required");
      return;
    }
    onSave(next);
    setEditing(false);
  }

  return (
    <div className="flex flex-1 items-center gap-2 min-w-0">
      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setTitle(module.title);
                setEditing(false);
              }
            }}
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-sm"
          />
          <button type="button" onClick={save} className="text-xs text-blue-400 hover:text-blue-300">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setTitle(module.title);
              setEditing(false);
            }}
            className="text-xs text-slate-500 hover:text-white"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <h3 className="min-w-0 flex-1 truncate font-semibold">{module.title}</h3>
          <button
            type="button"
            onClick={() => {
              setTitle(module.title);
              setEditing(true);
            }}
            title="Edit module"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onDelete}
        title="Delete module"
        className="rounded-lg p-1.5 text-red-400 hover:bg-slate-700 hover:text-red-300"
      >
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
  const [fileUploading, setFileUploading] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(
    quizzes[0]?.id ?? null
  );
  const [contentForm, setContentForm] = useState({
    contentType: "VIDEO",
    contentUrl: "",
    contentBody: "",
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(lesson.title);

  const typeInfo = CONTENT_TYPES.find((t) => t.value === contentForm.contentType);
  const needsUrl = ["VIDEO", "PDF", "DOCUMENT", "SOP", "PPRT"].includes(contentForm.contentType);
  const needsBody = ["SOP", "PPRT", "DOCUMENT"].includes(contentForm.contentType);
  const urlRequired = ["VIDEO", "PDF"].includes(contentForm.contentType);

  async function saveLessonTitle() {
    const next = lessonTitle.trim();
    if (!next) {
      alert("Lesson title is required");
      return;
    }
    const ok = await onApi("PATCH", `/api/lessons/${lesson.id}`, { title: next });
    if (ok) setEditingTitle(false);
  }

  async function addContent() {
    if (urlRequired && !contentForm.contentUrl.trim()) {
      alert("Upload a file or paste a URL for this content type");
      return;
    }
    if (
      contentForm.contentType === "DOCUMENT" &&
      !contentForm.contentUrl.trim() &&
      !contentForm.contentBody.trim()
    ) {
      alert("Upload a document, paste a URL, or enter content text");
      return;
    }
    if (
      ["SOP", "PPRT"].includes(contentForm.contentType) &&
      !contentForm.contentBody.trim() &&
      !contentForm.contentUrl.trim()
    ) {
      alert("Enter content text or upload a file");
      return;
    }
    const ok = await onApi("POST", "/api/topics", {
      lessonId: lesson.id,
      ...contentForm,
    });
    if (ok) {
      setContentForm({ contentType: "VIDEO", contentUrl: "", contentBody: "" });
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
        <div className="min-w-0 flex-1">
          <span className="text-xs text-slate-500">Lesson {index + 1}</span>
          {editingTitle ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveLessonTitle();
                  if (e.key === "Escape") {
                    setLessonTitle(lesson.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => void saveLessonTitle()}
                disabled={loading}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setLessonTitle(lesson.title);
                  setEditingTitle(false);
                }}
                className="text-xs text-slate-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="font-medium">{lesson.title}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!editingTitle && (
            <button
              type="button"
              onClick={() => {
                setLessonTitle(lesson.title);
                setEditingTitle(true);
              }}
              title="Edit lesson"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-blue-300"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete lesson "${lesson.title}"?`)) {
                onApi("DELETE", `/api/lessons/${lesson.id}`);
              }
            }}
            title="Delete lesson"
            className="rounded-lg p-1.5 text-red-400 hover:bg-slate-700 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
            <p className="text-sm font-medium text-blue-300">
              Add to lesson: {lesson.title}
            </p>
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
              <ContentUrlField
                contentType={contentForm.contentType}
                value={contentForm.contentUrl}
                onChange={(contentUrl) => setContentForm({ ...contentForm, contentUrl })}
                onUploadingChange={setFileUploading}
              />
            )}
            {needsBody && (
              <div>
                <label className="text-xs text-slate-500">
                  Content text{contentForm.contentType === "DOCUMENT" ? " (optional if file uploaded)" : ""}
                </label>
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
                disabled={loading || fileUploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {fileUploading ? "Waiting for upload…" : "Save content"}
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
  const [fileUploading, setFileUploading] = useState(false);
  const [form, setForm] = useState({
    contentType: topic.contentType,
    contentUrl: topic.contentUrl ?? "",
    contentBody: topic.contentBody ?? "",
  });

  const typeInfo = CONTENT_TYPES.find((t) => t.value === topic.contentType);
  const Icon = typeInfo?.icon ?? FileText;
  const needsUrl = ["VIDEO", "PDF", "DOCUMENT", "SOP", "PPRT"].includes(form.contentType);
  const needsBody = ["SOP", "PPRT", "DOCUMENT"].includes(form.contentType);

  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      {!editing ? (
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{typeInfo?.label ?? topic.contentType}</p>
            {topic.contentUrl && (
              <p className="mt-1 truncate text-xs text-blue-400">{topic.contentUrl}</p>
            )}
            {topic.contentBody && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{topic.contentBody}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit content"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this content?")) onApi("DELETE", `/api/topics/${topic.id}`);
            }}
            title="Delete content"
            className="rounded-lg p-1.5 text-red-400 hover:bg-slate-700 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
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
            <ContentUrlField
              contentType={form.contentType}
              value={form.contentUrl}
              onChange={(contentUrl) => setForm({ ...form, contentUrl })}
              onUploadingChange={setFileUploading}
            />
          )}
          {needsBody && (
            <textarea
              value={form.contentBody}
              onChange={(e) => setForm({ ...form, contentBody: e.target.value })}
              rows={4}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
              placeholder="Optional text content"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onApi("PATCH", `/api/topics/${topic.id}`, form);
                setEditing(false);
              }}
              disabled={fileUploading}
              className="text-xs text-blue-400 disabled:opacity-50"
            >
              {fileUploading ? "Waiting for upload…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={fileUploading}
              className="text-xs text-slate-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
