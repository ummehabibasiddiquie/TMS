"use client";

import { useState } from "react";
import { formatRole } from "@/lib/roles";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { AssignProjectModal } from "@/components/admin/AssignProjectModal";
import { Pencil, Trash2, FolderKanban } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string | null;
  dateOfJoining: Date | null;
};

type Project = {
  id: string;
  name: string;
  categoryRel: {
    id: string;
    name: string;
  } | null;
};

type Assignment = {
  userId: string;
  projectId: string;
};

interface UsersClientProps {
  users: User[];
  projects: Project[];
  assignments: Assignment[];
}

export function UsersClient({ users, projects, assignments }: UsersClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [userList, setUserList] = useState(users);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [assignmentsList, setAssignmentsList] = useState(assignments);

  const getUserProjects = (userId: string) => {
    return assignmentsList
      .filter(a => a.userId === userId)
      .map(a => projects.find(p => p.id === a.projectId)?.name)
      .filter(Boolean);
  };

  const filteredUsers = userList.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "All Roles" ||
      (roleFilter === "Admin" && user.role === "ADMIN") ||
      (roleFilter === "Team Lead" && user.role === "TRAINER") ||
      (roleFilter === "Employee" && user.role === "TRAINEE");

    const userDepartment = user.employeeId?.startsWith("TRN") ? "Email Ops" : "Annotation";
    const matchesDepartment =
      departmentFilter === "All Departments" ||
      departmentFilter === userDepartment;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

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
      alert("Failed to delete user. Please try again.");
      console.error("Delete error:", err);
    }
  };

  const handleAssignmentsUpdate = async () => {
    // Refresh assignments from server
    try {
      const res = await fetch("/api/project-assignments");
      const data = await res.json();
      if (data.assignments) {
        setAssignmentsList(data.assignments);
      }
    } catch (err) {
      console.error("Failed to refresh assignments:", err);
    }
  };

  return (
    <>
      <div className="w-full space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Manage Users</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Create, edit, and deactivate accounts</h1>
          <p className="mt-2 text-slate-400">Assign roles and departments for Employee, Team Lead, and Admin users.</p>
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
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <option>All Departments</option>
                <option>Annotation</option>
                <option>Email Ops</option>
                <option>Operations</option>
              </select>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              + Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  {["Name", "Email", "Role", "Department", "Joined", "Status", "Projects", ""].map((header) => (
                    <th key={header} className="py-3 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/70 text-slate-300">
                    <td className="py-3 font-medium text-white">{user.name}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">{formatRole(user.role)}</td>
                    <td className="py-3">{user.employeeId?.startsWith("TRN") ? "Email Ops" : "Annotation"}</td>
                    <td className="py-3">
                      {user.dateOfJoining
                        ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(user.dateOfJoining)
                        : "-"}
                    </td>
                    <td className="py-3">Active</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {getUserProjects(user.id).length > 0 ? (
                          getUserProjects(user.id).map((projectName, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 border border-blue-500/20"
                            >
                              {projectName}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">No projects</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <ActionButton
                          icon={FolderKanban}
                          label="Assign projects"
                          onClick={() => setAssigningUser(user)}
                          variant="edit"
                        />
                        <ActionButton
                          icon={Pencil}
                          label="Edit user"
                          onClick={() => setEditingUser(user)}
                          variant="edit"
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Delete user"
                          onClick={() => handleDelete(user.id)}
                          variant="delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-500">Showing {filteredUsers.length} of {userList.length} users</p>
        </div>
      </div>

      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onSuccess={(updatedUser) => {
            setUserList(userList.map((u) => u.id === updatedUser.id ? {
              ...updatedUser,
              dateOfJoining: updatedUser.dateOfJoining ? new Date(updatedUser.dateOfJoining) : null
            } : u));
          }}
        />
      )}
      {assigningUser && (
        <AssignProjectModal
          isOpen={!!assigningUser}
          onClose={() => setAssigningUser(null)}
          user={assigningUser}
          projects={projects}
          currentAssignments={assignmentsList.filter(a => a.userId === assigningUser.id).map(a => a.projectId)}
          onSuccess={handleAssignmentsUpdate}
        />
      )}
    </>
  );
}
