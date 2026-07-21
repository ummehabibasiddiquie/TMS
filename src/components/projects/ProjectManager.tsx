"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, FolderKanban } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

type Project = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryRel: {
    id: string;
    name: string;
  } | null;
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

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function ProjectManager({ projects: initial, user }: { projects: Project[]; user: User }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "" as string,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchQuery === "" ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && project.active) ||
      (statusFilter === "Inactive" && !project.active) ||
      (statusFilter === "Completed" && project.status === "COMPLETED") ||
      (statusFilter === "On Hold" && project.status === "ON_HOLD");

    return matchesSearch && matchesStatus;
  });

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("All Status");
  }

  function openCreate() {
    setForm({
      name: "",
      description: "",
      categoryId: "",
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
      categoryId: p.categoryId || "",
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
    try {
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
      if (modal === "create") {
        setProjects([{ ...data.project, assignments: [], creator: { id: user.id, name: user.name, email: user.email } }, ...projects]);
      } else if (modal === "edit" && editing) {
        setProjects(projects.map((p) => p.id === editing.id ? { ...data.project, assignments: p.assignments, creator: p.creator } : p));
      }
      setModal(null);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError("Failed to save project. Please try again.");
      console.error("Save error:", err);
    }
  }

  async function deleteProject(id: string) {
    const project = projects.find(p => p.id === id);
    const projectName = project?.name || "this project";
    const assignmentCount = project?.assignments.length || 0;
    
    const confirmMessage = assignmentCount > 0 
      ? `Are you sure you want to delete "${projectName}"?\n\nThis project has ${assignmentCount} assigned employee(s). Deleting it will remove all assignments and certifications associated with this project.`
      : `Are you sure you want to delete "${projectName}"?`;
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        alert(`Error: ${data.error || "Failed to delete project"}`);
        return;
      }
      // Show success message
      alert(data.message || "Project deleted successfully");
      setProjects(projects.filter((p) => p.id !== id));
      router.refresh();
    } catch (err) {
      setLoading(false);
      alert("Failed to delete project. Please try again.");
      console.error("Delete error:", err);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Manage Projects</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Create and manage projects</h1>
        <p className="mt-2 text-slate-400">
          Projects can be referenced on day-wise curriculum days. Training work is scheduled there —
          no separate employee assign needed.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 gap-3">
            <input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 flex-1"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear Filters
            </button>
            <button
              onClick={openCreate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              + Add Project
            </button>
          </div>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">No projects found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or create your first project</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  {["Project", "Active", "Status", "Priority", ""].map((header) => (
                    <th key={header || "actions"} className="py-3 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-800/70 text-slate-300">
                    <td className="py-3 font-medium text-white">{project.name}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${
                          project.active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                          project.active ? "bg-emerald-400" : "bg-slate-400"
                        }`} />
                        {project.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${
                          project.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : project.status === "COMPLETED"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : project.status === "ON_HOLD"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="py-3">{project.priority}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <ActionButton
                          icon={Pencil}
                          label="Edit project"
                          onClick={() => openEdit(project)}
                          variant="edit"
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Delete project"
                          onClick={() => deleteProject(project.id)}
                          variant="delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-sm text-slate-500">Showing {filteredProjects.length} of {projects.length} projects</p>
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
                  <label className="text-sm text-slate-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      setForm({
                        ...form,
                        status: nextStatus,
                        active: nextStatus === "ACTIVE",
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="COMING_SOON">Coming Soon</option>
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
