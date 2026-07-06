"use client";

import { useState, useEffect } from "react";
import { X, FolderKanban, Check } from "lucide-react";

type Project = {
  id: string;
  name: string;
  categoryRel: {
    id: string;
    name: string;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

interface AssignProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  projects: Project[];
  currentAssignments: string[];
  onSuccess: () => void;
}

export function AssignProjectModal({
  isOpen,
  onClose,
  user,
  projects,
  currentAssignments,
  onSuccess,
}: AssignProjectModalProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      setSelectedProjects(currentAssignments);
      setError("");
    }
  }, [isOpen, user, currentAssignments]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleAssign = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // First, remove all existing assignments for this user
      await fetch(`/api/users/${user.id}/assignments`, {
        method: "DELETE",
      });

      // Then, add the new assignments
      if (selectedProjects.length > 0) {
        await fetch(`/api/users/${user.id}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectIds: selectedProjects }),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError("Failed to update project assignments. Please try again.");
      console.error("Assignment error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-blue-300" />
            <h2 className="text-xl font-bold text-white">Assign Projects</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-400">
            Assigning projects to <span className="font-medium text-white">{user.name}</span>
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500">No active projects available</p>
          ) : (
            projects.map((project) => {
              const isSelected = selectedProjects.includes(project.id);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-slate-400">{project.categoryRel?.name || "Uncategorized"}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-300" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAssign}
            disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : `Assign ${selectedProjects.length} Project${selectedProjects.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
