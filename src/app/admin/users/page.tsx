import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRole } from "@/lib/roles";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      dateOfJoining: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Admin - Manage Users</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Create, edit, and deactivate accounts</h1>
        <p className="mt-2 text-slate-400">Assign roles and departments for Employee, Team Lead, and Admin users.</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            placeholder="Search by name or email..."
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 md:w-72"
          />
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <option>All Roles</option>
            <option>Employee</option>
            <option>Team Lead</option>
            <option>Admin</option>
          </select>
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            <option>All Departments</option>
            <option>Annotation</option>
            <option>Email Ops</option>
            <option>Operations</option>
          </select>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white md:ml-auto">
            + Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-800">
                {["Name", "Email", "Role", "Department", "Joined", "Status", ""].map((header) => (
                  <th key={header} className="py-3 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                  <td className="py-3 text-blue-300">Edit</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">Showing {users.length} of {users.length} users</p>
      </div>
    </div>
  );
}
