import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRole } from "@/lib/roles";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { UsersClient } from "./UsersClient";

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

  return <UsersClient users={users} />;
}
