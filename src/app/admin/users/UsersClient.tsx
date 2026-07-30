"use client";

import { useEffect, useState } from "react";
import { formatRole } from "@/lib/roles";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { formatDisplayDate } from "@/lib/format-date";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string | null;
  active: boolean;
  dateOfJoining: string | null;
  trainerId?: string | null;
  trainerName?: string | null;
};

type StaffOption = {
  id: string;
  name: string;
  email: string;
};

interface UsersClientProps {
  users: User[];
  teamLeads: StaffOption[];
  mode?: "admin" | "teamlead";
}

export function UsersClient({
  users,
  teamLeads: initialTeamLeads,
  mode = "admin",
}: UsersClientProps) {
  const isTeamLead = mode === "teamlead";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userList, setUserList] = useState(users);
  const [teamLeads, setTeamLeads] = useState(initialTeamLeads);

  useEffect(() => {
    setUserList(users);
  }, [users]);

  useEffect(() => {
    setTeamLeads(initialTeamLeads);
  }, [initialTeamLeads]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredUsers = userList.filter((user) => {
    if (isTeamLead && user.role !== "TRAINEE") return false;

    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "All Roles" ||
      (roleFilter === "Admin" && user.role === "ADMIN") ||
      (roleFilter === "Team Lead" && user.role === "TRAINER") ||
      (roleFilter === "Employee" && user.role === "TRAINEE");

    const matchesStatus =
      statusFilter === "All Statuses" ||
      (statusFilter === "Active" && user.active === true) ||
      (statusFilter === "Inactive" && user.active !== true);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleActive = async (target: User) => {
    const currentlyActive = target.active === true;
    const nextActive = !currentlyActive;
    const action = nextActive ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${action} ${target.name}?`)) return;

    setTogglingId(target.id);
    try {
      const res = await fetch(`/api/users/${target.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Failed to ${action} user`);
        return;
      }
      setUserList((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, active: data.user?.active === true } : u))
      );
    } catch (err) {
      console.error("Toggle active error:", err);
      alert(`Failed to ${action} user`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
        return;
      }
      setUserList(userList.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete user");
    }
  };

  return (
    <>
      <div className="w-full space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            {isTeamLead ? "Team Lead — Manage trainees" : "Admin — Manage Users"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {isTeamLead
              ? "Add and manage trainees on your team"
              : "Create, edit, and deactivate accounts"}
          </h1>
          <p className="mt-1 text-slate-400">
            {isTeamLead
              ? "You can add Employee (trainee) accounts only — not Admin or Team Lead. New trainees are assigned to you automatically."
              : "All users (Admin, Team Lead, and Employee). Courses and work are set in Day Curriculum, not by assigning here."}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 gap-3">
              <input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 flex-1"
              />
              {!isTeamLead && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  <option>All Roles</option>
                  <option>Employee</option>
                  <option>Team Lead</option>
                  <option>Admin</option>
                </select>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              + {isTeamLead ? "Add trainee" : "Add User"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  {(isTeamLead
                    ? ["Name", "Email", "Role", "Joined", "Status", ""]
                    : ["Name", "Email", "Role", "Team Lead", "Joined", "Status", ""]
                  ).map((header) => (
                    <th key={header || "actions"} className="py-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/70 text-slate-300">
                    <td className="py-3">
                      <div className="font-medium text-white">{user.name}</div>
                      {user.active !== true && (
                        <div className="mt-1 text-xs font-medium text-amber-400">
                          Deactivated — cannot log in
                        </div>
                      )}
                    </td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">{formatRole(user.role)}</td>
                    {!isTeamLead && (
                      <td className="py-3">
                        {user.role === "TRAINEE" ? (
                          user.trainerName ? (
                            <span className="text-slate-200">{user.trainerName}</span>
                          ) : (
                            <span className="text-xs text-amber-400">No Team Lead</span>
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3">
                      {user.dateOfJoining
                        ? formatDisplayDate(user.dateOfJoining)
                        : "-"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
                          user.active === true
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {user.active === true ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {(isTeamLead ? user.role === "TRAINEE" : true) && (
                          <>
                            <ActionButton
                              icon={Pencil}
                              label="Edit user"
                              onClick={() => setEditingUser(user)}
                              variant="edit"
                            />
                            <ActionButton
                              icon={user.active === true ? UserX : UserCheck}
                              label={user.active === true ? "Deactivate" : "Activate"}
                              onClick={() => void handleToggleActive(user)}
                              variant={user.active === true ? "deactivate" : "activate"}
                              disabled={togglingId === user.id}
                            />
                            <ActionButton
                              icon={Trash2}
                              label="Delete user"
                              onClick={() => handleDelete(user.id)}
                              variant="delete"
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Showing {filteredUsers.length} of {userList.length} users
          </p>
        </div>
      </div>

      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamLeads={teamLeads}
        teamLeadMode={isTeamLead}
        onCreated={(created) => {
          setUserList((prev) => {
            if (prev.some((u) => u.id === created.id)) return prev;
            return [...prev, created];
          });
          if (created.role === "TRAINER" && created.active) {
            setTeamLeads((prev) => {
              if (prev.some((t) => t.id === created.id)) return prev;
              return [
                ...prev,
                { id: created.id, name: created.name, email: created.email },
              ];
            });
          }
        }}
      />
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          teamLeads={teamLeads}
          teamLeadMode={isTeamLead}
          onSuccess={(updatedUser) => {
            setUserList(
              userList.map((u) =>
                u.id === updatedUser.id
                  ? {
                      ...u,
                      name: updatedUser.name,
                      email: updatedUser.email,
                      role: updatedUser.role,
                      employeeId: updatedUser.employeeId,
                      dateOfJoining:
                        updatedUser.dateOfJoining == null
                          ? null
                          : typeof updatedUser.dateOfJoining === "string"
                            ? updatedUser.dateOfJoining
                            : new Date(updatedUser.dateOfJoining).toISOString(),
                      trainerId: updatedUser.trainerId ?? null,
                      trainerName: updatedUser.trainerName ?? null,
                    }
                  : u
              )
            );
            setEditingUser(null);
          }}
        />
      )}
    </>
  );
}
