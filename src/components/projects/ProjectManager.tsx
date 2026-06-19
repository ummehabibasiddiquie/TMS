"use client";

import { useState } from "react";
<<<<<<< HEAD
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Project {
=======
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Users, Calendar, Link as LinkIcon, FileText } from "lucide-react";

type Project = {
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
<<<<<<< HEAD
  priority: string;
  url: string | null;
  documentation: string | null;
  active: boolean;
  createdAt: string;
  _count: {
    assignments: number;
    certifications: number;
  };
}

interface ProjectManagerProps {
  initialProjects: Project[];
}

export function ProjectManager({ initialProjects }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
    name: "",
    description: "",
    category: "",
    status: "ACTIVE",
<<<<<<< HEAD
    priority: "MEDIUM",
    url: "",
    documentation: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProject
        ? `/api/projects/${editingProject.id}`
        : "/api/projects";
      const method = editingProject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingProject) {
          setProjects(projects.map((p) => (p.id === editingProject.id ? data.project : p)));
        } else {
          setProjects([...projects, data.project]);
        }
        setShowModal(false);
        setEditingProject(null);
        setFormData({
          name: "",
          description: "",
          category: "",
          status: "ACTIVE",
          priority: "MEDIUM",
          url: "",
          documentation: "",
        });
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      category: project.category || "",
      status: project.status,
      priority: project.priority,
      url: project.url || "",
      documentation: project.documentation || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
      name: "",
      description: "",
      category: "",
      status: "ACTIVE",
<<<<<<< HEAD
      priority: "MEDIUM",
      url: "",
      documentation: "",
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 flex items-center gap-2"
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

<<<<<<< HEAD
      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 border-b border-slate-800 p-4 text-sm font-semibold text-slate-300">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-1">Assignments</div>
          <div className="col-span-2">Actions</div>
        </div>
        {projects.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No projects found. Click "Add Project" to create one.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 border-b border-slate-800 p-4 text-sm hover:bg-slate-800/50 transition-colors"
            >
              <div className="col-span-1 md:col-span-3">
                <div className="font-medium text-white">{project.name}</div>
                {project.description && (
                  <div className="text-xs text-slate-400 line-clamp-2 md:line-clamp-1">
                    {project.description}
                  </div>
                )}
              </div>
              <div className="col-span-1 md:col-span-2 text-slate-300">
                <span className="md:hidden text-xs text-slate-500">Category: </span>
                {project.category || "-"}
              </div>
              <div className="col-span-1 md:col-span-2">
                <span className="md:hidden text-xs text-slate-500">Status: </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    project.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : project.status === "COMING_SOON"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-slate-500/15 text-slate-300"
                  }`}
                >
                  {project.status.replace("_", " ")}
                </span>
              </div>
              <div className="col-span-1 md:col-span-2">
                <span className="md:hidden text-xs text-slate-500">Priority: </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    project.priority === "HIGH"
                      ? "bg-red-500/15 text-red-300"
                      : project.priority === "MEDIUM"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-slate-500/15 text-slate-300"
                  }`}
                >
                  {project.priority}
                </span>
              </div>
              <div className="col-span-1 md:col-span-1 text-slate-300">
                <span className="md:hidden text-xs text-slate-500">Assignments: </span>
                {project._count.assignments}
              </div>
              <div className="col-span-1 md:col-span-2 flex gap-2 items-center justify-end">
                <button
                  onClick={() => handleEdit(project)}
                  className="rounded p-2 text-blue-300 hover:bg-slate-800 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="rounded p-2 text-red-300 hover:bg-slate-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
              </div>
            </div>
          ))
        )}
      </div>

<<<<<<< HEAD
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingProject ? "Edit Project" : "Add New Project"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
<<<<<<< HEAD
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMING_SOON">Coming Soon</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
                  </select>
                </div>
              </div>
              <div>
<<<<<<< HEAD
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Documentation URL
                </label>
                <input
                  type="url"
                  value={formData.documentation}
                  onChange={(e) =>
                    setFormData({ ...formData, documentation: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  {editingProject ? "Update" : "Create"} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
=======
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
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
  );
}
