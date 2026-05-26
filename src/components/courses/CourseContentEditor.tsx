"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  title: string;
  contentType: string;
  contentUrl: string | null;
  contentBody: string | null;
  durationSec: number | null;
};

type Lesson = {
  id: string;
  title: string;
  lessonType: string;
  description: string | null;
  durationMin: number | null;
  topics: Topic[];
  quiz: { id: string; title: string } | null;
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

const LESSON_TYPES = [
  { value: "CONTENT", label: "Content (Video / PDF / SOP / PPRT)" },
  { value: "QUIZ", label: "Quiz / Assessment" },
  { value: "ASSIGNMENT", label: "Assignment" },
];

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
    const type = prompt(
      "Lesson type: CONTENT, QUIZ, or ASSIGNMENT",
      "CONTENT"
    )?.toUpperCase() || "CONTENT";
    await api("POST", "/api/lessons", {
      moduleId,
      title,
      lessonType: ["CONTENT", "QUIZ", "ASSIGNMENT"].includes(type) ? type : "CONTENT",
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
          <p className="text-slate-400">Add modules, lessons, and content (videos, PDFs, SOP, PPRT)</p>
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
        <p className="font-medium text-blue-300">How to add content</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-slate-400">
          <li>Create a <strong className="text-slate-300">Module</strong> (e.g. Module 2: SOP Training)</li>
          <li>Add a <strong className="text-slate-300">Lesson</strong> inside it (e.g. REX SOP)</li>
          <li>For content lessons, click <strong className="text-slate-300">Add content</strong> and choose Video, PDF, SOP, or PPRT</li>
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
  const [showAddContent, setShowAddContent] = useState(false);
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

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-slate-500">Lesson {index + 1}</span>
          <p className="font-medium">{lesson.title}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded px-2 py-0.5 text-xs",
              lesson.lessonType === "QUIZ" && "bg-purple-500/20 text-purple-300",
              lesson.lessonType === "ASSIGNMENT" && "bg-amber-500/20 text-amber-300",
              lesson.lessonType === "CONTENT" && "bg-blue-500/20 text-blue-300"
            )}
          >
            {lesson.lessonType}
          </span>
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

      {lesson.lessonType === "QUIZ" && lesson.quiz && (
        <p className="mt-2 flex items-center gap-1 text-sm text-slate-400">
          <HelpCircle className="h-4 w-4" />
          Quiz: {lesson.quiz.title} — edit questions in database seed or future quiz editor
        </p>
      )}

      {lesson.lessonType === "ASSIGNMENT" && lesson.assignment && (
        <p className="mt-2 text-sm text-slate-400">
          Assignment: {lesson.assignment.title}
        </p>
      )}

      {lesson.lessonType === "CONTENT" && (
        <div className="mt-4 space-y-3">
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
                {typeInfo && (
                  <p className="mt-1 text-xs text-slate-500">{typeInfo.hint}</p>
                )}
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
