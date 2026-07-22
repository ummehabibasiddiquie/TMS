"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, FolderOpen, Image as ImageIcon, Upload, UserPlus } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  modules: { _count: { lessons: number } }[];
  _count: { enrollments: number };
};

function normalizeCourse(raw: {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  modules?: { lessons?: unknown[]; _count?: { lessons?: number } }[];
  _count?: { enrollments?: number };
}): Course {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    thumbnail: raw.thumbnail,
    published: raw.published,
    modules: (raw.modules || []).map((m) => ({
      _count: { lessons: m._count?.lessons ?? m.lessons?.length ?? 0 },
    })),
    _count: { enrollments: raw._count?.enrollments ?? 0 },
  };
}

export function CourseManager({
  courses: initial,
  basePath = "/trainer",
}: {
  courses: Course[];
  basePath?: "/trainer" | "/admin";
}) {
  const router = useRouter();
  const [courses, setCourses] = useState(initial);

  useEffect(() => {
    setCourses(initial);
  }, [initial]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: "", description: "", published: false, thumbnail: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setForm({ title: "", description: "", published: false, thumbnail: "" });
    setEditing(null);
    setModal("create");
    setError("");
  }

  function openEdit(c: Course) {
    setForm({
      title: c.title,
      description: c.description ?? "",
      published: c.published,
      thumbnail: c.thumbnail ?? "",
    });
    setEditing(c);
    setModal("edit");
    setError("");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploading(false);

      if (!res.ok) {
        setError(data.error || "Failed to upload image");
        return;
      }

      setForm({ ...form, thumbnail: data.url });
    } catch (err) {
      setUploading(false);
      setError("Failed to upload image");
    }
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError("");
    const url = modal === "edit" && editing ? `/api/courses/${editing.id}` : "/api/courses";
    const method = modal === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to save");
      return;
    }
    if (data.course) {
      const next = normalizeCourse(data.course);
      if (modal === "create") {
        setCourses((list) => [next, ...list]);
      } else if (editing) {
        setCourses((list) =>
          list.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  title: next.title,
                  description: next.description,
                  thumbnail: next.thumbnail,
                  published: next.published,
                }
              : c
          )
        );
      }
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCourses((list) => list.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      <div className="space-y-4">
        {courses.map((c) => (
          <div key={c.id} className="glass-panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                {c.thumbnail && (
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{c.description || "No description"}</p>
                  <div className="mt-3 flex gap-4 text-sm text-slate-500">
                    <span>{c.modules.length} modules</span>
                    <span>
                      {c.modules.reduce((s, m) => s + m._count.lessons, 0)} lessons
                    </span>
                    <span>{c._count.enrollments} enrolled</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`${basePath}/courses/${c.id}/content`}
                  className="flex items-center gap-1 rounded-lg bg-blue-600/80 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  <FolderOpen className="h-4 w-4" />
                  Manage Content
                </Link>
                <ActionButton
                  icon={UserPlus}
                  label="Assign users"
                  onClick={() => router.push(`/admin/users`)}
                  variant="edit"
                />
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    c.published
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {c.published ? "Active" : "Inactive"}
                </span>
                <ActionButton
                  icon={Pencil}
                  label="Edit course"
                  onClick={() => openEdit(c)}
                  variant="edit"
                />
                <ActionButton
                  icon={Trash2}
                  label="Delete course"
                  onClick={() => remove(c.id, c.title)}
                  variant="delete"
                />
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-center text-slate-500">No courses yet. Click Add Course to create one.</p>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {modal === "create" ? "Add Course" : "Edit Course"}
              </h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Course Image</label>
                <div className="mt-2 space-y-2">
                  {form.thumbnail ? (
                    <div className="relative inline-block">
                      <img
                        src={form.thumbnail}
                        alt="Course thumbnail"
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => setForm({ ...form, thumbnail: "" })}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-slate-400 hover:border-blue-500 hover:text-blue-300 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>{uploading ? "Uploading..." : "Upload Image"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-500">JPG, PNG, WEBP, GIF (max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                <span className="text-sm">Active (visible in training)</span>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl border border-slate-600 py-2 text-sm hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
