import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProjectManager } from "@/components/projects/ProjectManager";
import { prisma } from "@/lib/db";

export default async function AdminProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  const projects = await prisma.project.findMany({
    include: {
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
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
  }) as any;

  return <ProjectManager projects={projects} user={user} />;
}
