"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, FileText, Link as LinkIcon, Plus, X, Trash2, BookOpen, HelpCircle } from "lucide-react";

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
    userId: string;
    status: string;
    assignedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    assigner: {
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

export function ProjectDetails({ project, user }: { project: Project; user: User }) {
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";
  const canManage = isAdmin || isTeamLead;

  async function loadUsers() {
    if (allUsers.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (err) {
      setError("Failed to load users");
    }
    setLoading(false);
  }

  async function handleAssign() {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers, status: "ASSIGNED" }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Failed to assign users");
        return;
      }
      setShowAssignModal(false);
      setSelectedUsers([]);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError("Failed to assign users");
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      setLoading(false);
      if (!res.ok) {
        alert("Failed to remove assignment");
        return;
      }
      router.refresh();
    } catch (err) {
      setLoading(false);
      alert("Failed to remove assignment");
    }
  }

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={isAdmin || isTeamLead ? "/admin/projects" : "/projects"}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Project Details</p>
          <h1 className="mt-3 text-3xl font-bold text-white">{project.name}</h1>
        </div>
        {canManage && (
          <button
            onClick={() => {
              loadUsers();
              setShowAssignModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Assign Users
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4">Project Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Description</p>
                <p className="mt-1 text-white">{project.description || "No description provided"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Category</p>
                  <p className="mt-1 text-white">{project.categoryRel?.name || "Uncategorized"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <p className="mt-1 text-white">{project.status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Priority</p>
                  <p className="mt-1 text-white">{project.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Active</p>
                  <p className="mt-1 text-white">{project.active ? "Yes" : "No"}</p>
                </div>
              </div>
              {project.startDate && (
                <div>
                  <p className="text-sm text-slate-400">Start Date</p>
                  <p className="mt-1 text-white">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
              )}
              {project.endDate && (
                <div>
                  <p className="text-sm text-slate-400">End Date</p>
                  <p className="mt-1 text-white">{new Date(project.endDate).toLocaleDateString()}</p>
                </div>
              )}
              {project.url && (
                <div>
                  <p className="text-sm text-slate-400">Reference URL</p>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {project.url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {project.resources && (
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resources
              </h2>
              <p className="text-white whitespace-pre-wrap">{project.resources}</p>
            </div>
          )}

          {project.documentation && (
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation
              </h2>
              <p className="text-white whitespace-pre-wrap">{project.documentation}</p>
            </div>
          )}

          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4">Training & Certification</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href={`/projects/${project.id}/train`}
                className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-4 hover:bg-slate-800 transition"
              >
                <BookOpen className="h-5 w-5 text-blue-300" />
                <div>
                  <p className="font-medium text-white">Training Modules</p>
                  <p className="text-sm text-slate-400">Study project guidelines</p>
                </div>
              </Link>
              <Link
                href={`/projects/${project.id}/quiz`}
                className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-4 hover:bg-slate-800 transition"
              >
                <HelpCircle className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="font-medium text-white">Certification Quiz</p>
                  <p className="text-sm text-slate-400">Test your knowledge</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Team ({project.assignments.length})
            </h2>
            <div className="space-y-3">
              {project.assignments.length === 0 ? (
                <p className="text-sm text-slate-400">No users assigned to this project yet.</p>
              ) : (
                project.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-slate-800/50 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{assignment.user.name}</p>
                      <p className="text-xs text-slate-400">{assignment.user.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Status: {assignment.status} • Assigned:{" "}
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4">Project Metadata</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400">Created by</p>
                <p className="text-white">{project.creator.name}</p>
                <p className="text-xs text-slate-500">{project.creator.email}</p>
              </div>
              <div>
                <p className="text-slate-400">Created at</p>
                <p className="text-white">{new Date(project.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Assign Users</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {loading && allUsers.length === 0 ? (
                <p className="text-sm text-slate-400">Loading users...</p>
              ) : allUsers.length === 0 ? (
                <p className="text-sm text-slate-400">No users available to assign.</p>
              ) : (
                allUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 cursor-pointer hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <span className="text-xs text-slate-500">{u.role}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAssign}
                disabled={loading || selectedUsers.length === 0}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Assigning..." : `Assign ${selectedUsers.length} User(s)`}
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
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
