"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
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
    name: "",
    description: "",
    category: "",
    status: "ACTIVE",
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
      name: "",
      description: "",
      category: "",
      status: "ACTIVE",
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
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

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
              </div>
            </div>
          ))
        )}
      </div>

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
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
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
                  </select>
                </div>
              </div>
              <div>
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
  );
}
