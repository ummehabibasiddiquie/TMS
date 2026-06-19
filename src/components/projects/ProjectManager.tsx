"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Users, Calendar, FileText } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  priority: string;
  resources: string | null;
  documentation: string | null;
  url: string | null;
  active: boolean;
  createdAt: string;
  assignments: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  creator: {
    id: string;
    name: string;
    email: string;
  };
};

export function ProjectManager({ projects: initial }: { projects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    priority: "MEDIUM",
    resources: "",
    documentation: "",
    url: "",
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setForm({
      name: "",
      description: "",
      category: "",
      status: "ACTIVE",
      startDate: "",
      endDate: "",
      priority: "MEDIUM",
      resources: "",
      documentation: "",
      url: "",
      active: true,
    });
    setEditing(null);
    setModal("create");
    setError("");
  }

  function openEdit(p: Project) {
    setForm({
      name: p.name,
      description: p.description || "",
      category: p.category || "",
      status: p.status,
      startDate: p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "",
      endDate: p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : "",
      priority: p.priority,
      resources: p.resources || "",
      documentation: p.documentation || "",
      url: p.url || "",
      active: p.active,
    });
    setEditing(p);
    setModal("edit");
    setError("");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Project name is required");
      return;
    }
    setLoading(true);
    setError("");
    const url = modal === "edit" && editing ? `/api/projects/${editing.id}` : "/api/projects";
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
    setModal(null);
    router.refresh();
  }

  async function deleteProject(id: string) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      alert("Failed to delete project");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Project Management</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Manage Projects</h1>
          <p className="mt-2 text-slate-400">Create, edit, and assign projects to team members.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">No projects found. Create your first project to get started.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        project.active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {project.active ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {project.category || "Uncategorized"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{project.description || "No description"}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{project.assignments.length} assigned</span>
                    </div>
                    {project.startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                      Priority: {project.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
                  >
                    <FileText className="h-4 w-4" />
                    Details
                  </button>
                  <button
                    onClick={() => openEdit(project)}
                    className="rounded-lg bg-slate-700 p-2 hover:bg-slate-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{modal === "create" ? "Create Project" : "Edit Project"}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm text-slate-400">Project Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Active</label>
                  <select
                    value={form.active.toString()}
                    onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Resources</label>
                <textarea
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  placeholder="List resources, tools, or materials..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Documentation</label>
                <textarea
                  value={form.documentation}
                  onChange={(e) => setForm({ ...form, documentation: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  placeholder="Documentation links or notes..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Reference URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Saving..." : modal === "create" ? "Create Project" : "Update Project"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
