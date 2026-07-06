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

  const projects = await prisma.project.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const courses = await prisma.course.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      description: true,
      published: true,
    },
    orderBy: { title: "asc" },
  });

  // Fetch user assignments
  const assignments = await prisma.projectAssignment.findMany({
    select: {
      userId: true,
      projectId: true,
    },
  });

  // Fetch user enrollments
  const enrollments = await prisma.enrollment.findMany({
    select: {
      userId: true,
      courseId: true,
    },
  });

  return <UsersClient users={users} projects={projects} courses={courses} assignments={assignments} enrollments={enrollments} />;
}
