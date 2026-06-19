import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectManager } from "@/components/projects/ProjectManager";
import { prisma } from "@/lib/db";

export default async function AdminProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  const projects = await prisma.project.findMany({
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={user}>
      <ProjectManager projects={projects} />
    </AppShell>
  );
}
