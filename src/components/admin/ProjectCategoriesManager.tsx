"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, FolderKanban, Clock, AlertCircle, Power, PowerOff } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

type ProjectCategory = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    projects: number;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

interface ProjectCategoriesManagerProps {
  categories: ProjectCategory[];
  user: User;
}

export function ProjectCategoriesManager({ categories: initial, user }: ProjectCategoriesManagerProps) {
  const [categories, setCategories] = useState(initial);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ProjectCategory | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      searchQuery === "" ||
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.code && category.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && category.status === "ACTIVE") ||
      (statusFilter === "Inactive" && category.status === "INACTIVE");

    return matchesSearch && matchesStatus;
  });

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("All Status");
  }

  function openCreate() {
    setForm({
      name: "",
      code: "",
      description: "",
      status: "ACTIVE",
    });
    setEditing(null);
    setModal("create");
    setError("");
  }

  function openEdit(category: ProjectCategory) {
    setForm({
      name: category.name,
      code: category.code || "",
      description: category.description || "",
      status: category.status,
    });
    setEditing(category);
    setModal("edit");
    setError("");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Category name is required");
      return;
    }
    setLoading(true);
    setError("");
    const url = modal === "edit" && editing ? `/api/project-categories/${editing.id}` : "/api/project-categories";
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
        setCategories([{ ...data.category, creator: { id: user.id, name: user.name, email: user.email } }, ...categories]);
      } else if (modal === "edit" && editing) {
        setCategories(categories.map((c) => c.id === editing.id ? { ...data.category, creator: c.creator } : c));
      }
      setModal(null);
    } catch (err) {
      setLoading(false);
      setError("Failed to save category. Please try again.");
      console.error("Save error:", err);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/project-categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        alert(data.error || "Failed to delete category");
        return;
      }
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      setLoading(false);
      alert("Failed to delete category. Please try again.");
      console.error("Delete error:", err);
    }
  }

  async function toggleStatus(category: ProjectCategory) {
    const newStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setLoading(true);
    try {
      const res = await fetch(`/api/project-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        alert(data.error || "Failed to update status");
        return;
      }
      setCategories(categories.map((c) => c.id === category.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      setLoading(false);
      alert("Failed to update status. Please try again.");
      console.error("Status update error:", err);
    }
  }

  return (
    <>
      <div className="w-full space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Project Categories</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Manage project categories</h1>
          <p className="mt-2 text-slate-400">Create, edit, and manage project categories for classification.</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 gap-3">
              <input
                placeholder="Search categories..."
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
                + Add Category
              </button>
            </div>
          </div>
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No categories found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or create your first category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-800">
                    {["Category Name", "Code", "Description", "Status", "Projects", "Created", "Actions"].map((header) => (
                      <th key={header} className="py-3 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="border-b border-slate-800/70 text-slate-300">
                      <td className="py-3 font-medium text-white">{category.name}</td>
                      <td className="py-3">{category.code || "-"}</td>
                      <td className="py-3">{category.description || "-"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            category.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {category.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3">{category._count.projects}</td>
                      <td className="py-3">
                        {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(
                          new Date(category.createdAt)
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <ActionButton
                            icon={Pencil}
                            label="Edit category"
                            onClick={() => openEdit(category)}
                            variant="edit"
                          />
                          <ActionButton
                            icon={category.status === "ACTIVE" ? PowerOff : Power}
                            label={category.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatus(category)}
                            variant={category.status === "ACTIVE" ? "deactivate" : "activate"}
                          />
                          <ActionButton
                            icon={Trash2}
                            label="Delete category"
                            onClick={() => deleteCategory(category.id)}
                            variant="delete"
                            disabled={category._count.projects > 0}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-500">Showing {filteredCategories.length} of {categories.length} categories</p>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {modal === "create" ? "Add Category" : "Edit Category"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="e.g., Data Annotation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category Code (Optional)
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="e.g., DA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 resize-none"
                  rows={3}
                  placeholder="Brief description of the category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-800">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Saving..." : modal === "create" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
