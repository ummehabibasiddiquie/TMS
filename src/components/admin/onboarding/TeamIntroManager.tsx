"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Save, Users } from "lucide-react";

interface TeamIntro {
  id: string;
  title: string;
  content: string;
  order: number;
  employees: TeamEmployee[];
}

interface TeamEmployee {
  id: string;
  userId: string;
  role: string;
  manager?: string;
  metadata?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TeamIntroManagerProps {
  templateId: string;
  teamIntros: TeamIntro[];
  onUpdate: () => void;
}

export function TeamIntroManager({ templateId, teamIntros, onUpdate }: TeamIntroManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIntro, setEditingIntro] = useState<TeamIntro | null>(null);
  const [managingEmployees, setManagingEmployees] = useState<TeamIntro | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const createTeamIntro = async (title: string, content: string, order: number) => {
    try {
      await fetch("/api/admin/onboarding/team-intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, title, content, order })
      });
      setShowCreateModal(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to create team intro:", error);
    }
  };

  const updateTeamIntro = async (introId: string, title: string, content: string, order: number) => {
    try {
      await fetch(`/api/admin/onboarding/team-intros/${introId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, order })
      });
      setEditingIntro(null);
      onUpdate();
    } catch (error) {
      console.error("Failed to update team intro:", error);
    }
  };

  const deleteTeamIntro = async (introId: string) => {
    if (!confirm("Are you sure you want to delete this team introduction?")) return;
    try {
      await fetch(`/api/admin/onboarding/team-intros/${introId}`, {
        method: "DELETE"
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to delete team intro:", error);
    }
  };

  const addEmployee = async (introId: string, userId: string, role: string, manager?: string, metadata?: any) => {
    try {
      await fetch(`/api/admin/onboarding/team-intros/${introId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, manager, metadata })
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to add employee:", error);
    }
  };

  const removeEmployee = async (introId: string, employeeId: string) => {
    try {
      await fetch(`/api/admin/onboarding/team-intros/${introId}/employees/${employeeId}`, {
        method: "DELETE"
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to remove employee:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Team Introduction Modules</h4>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Team Intro
        </button>
      </div>

      {teamIntros.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-2 text-slate-400">No team introductions configured</p>
          <p className="text-sm text-slate-500">Add team introductions to help new employees</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teamIntros.map((intro) => (
            <div
              key={intro.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{intro.title}</p>
                <p className="text-sm text-slate-400">
                  {intro.employees.length} employees assigned
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManagingEmployees(intro)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
                >
                  Manage Employees
                </button>
                <button
                  onClick={() => setEditingIntro(intro)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteTeamIntro(intro.id)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-red-400 hover:bg-slate-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <TeamIntroModal
          onClose={() => setShowCreateModal(false)}
          onSave={createTeamIntro}
        />
      )}

      {/* Edit Modal */}
      {editingIntro && (
        <TeamIntroModal
          intro={editingIntro}
          onClose={() => setEditingIntro(null)}
          onSave={(title, content, order) => updateTeamIntro(editingIntro.id, title, content, order)}
        />
      )}

      {/* Employee Management Modal */}
      {managingEmployees && (
        <EmployeeManagementModal
          intro={managingEmployees}
          availableUsers={availableUsers}
          onClose={() => setManagingEmployees(null)}
          onAddEmployee={(userId, role, manager, metadata) => 
            addEmployee(managingEmployees.id, userId, role, manager, metadata)
          }
          onRemoveEmployee={(employeeId) => removeEmployee(managingEmployees.id, employeeId)}
        />
      )}
    </div>
  );
}

function TeamIntroModal({
  intro,
  onClose,
  onSave
}: {
  intro?: TeamIntro;
  onClose: () => void;
  onSave: (title: string, content: string, order: number) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave(
      formData.get("title") as string,
      formData.get("content") as string,
      parseInt(formData.get("order") as string) || 0
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {intro ? "Edit Team Introduction" : "Create Team Introduction"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Title</label>
            <input
              name="title"
              defaultValue={intro?.title}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="e.g., Development Team"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Content</label>
            <textarea
              name="content"
              defaultValue={intro?.content}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="HTML content for team introduction..."
              rows={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Order</label>
            <input
              name="order"
              type="number"
              defaultValue={intro?.order ?? 0}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4 inline" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeManagementModal({
  intro,
  availableUsers,
  onClose,
  onAddEmployee,
  onRemoveEmployee
}: {
  intro: TeamIntro;
  availableUsers: User[];
  onClose: () => void;
  onAddEmployee: (userId: string, role: string, manager?: string, metadata?: any) => void;
  onRemoveEmployee: (employeeId: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("");
  const [manager, setManager] = useState("");

  const assignedUserIds = intro.employees.map(e => e.userId);
  const availableToAdd = availableUsers.filter(u => !assignedUserIds.includes(u.id));

  const handleAddEmployee = () => {
    if (selectedUserId && role) {
      onAddEmployee(selectedUserId, role, manager || undefined);
      setSelectedUserId("");
      setRole("");
      setManager("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Manage Employees - {intro.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add Employee Form */}
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-slate-300">Add Employee</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">Select user...</option>
              {availableToAdd.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g., Developer)"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="Manager (optional)"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <button
              onClick={handleAddEmployee}
              disabled={!selectedUserId || !role}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add
            </button>
          </div>
        </div>

        {/* Current Employees */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-slate-300">Current Employees ({intro.employees.length})</h4>
          {intro.employees.length === 0 ? (
            <p className="text-slate-500 text-sm">No employees assigned yet</p>
          ) : (
            <div className="space-y-2">
              {intro.employees.map(employee => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div>
                    <p className="font-medium text-white">{employee.user.name}</p>
                    <p className="text-sm text-slate-400">{employee.role}</p>
                    {employee.manager && (
                      <p className="text-xs text-slate-500">Manager: {employee.manager}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveEmployee(employee.id)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-red-400 hover:bg-slate-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
