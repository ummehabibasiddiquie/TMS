import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { prisma } from "@/lib/db";

export default async function ProjectDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
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
          assigner: {
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
  });

  if (!project) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-6xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Project not found</h1>
        </div>
      </AppShell>
    );
  }

  // Check if user has access (Admin, Team Lead, or assigned employee)
  const isAssigned = project.assignments.some((a) => a.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";

  if (!isAdmin && !isTeamLead && !isAssigned) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-6xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-slate-400">You don't have permission to view this project.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <ProjectDetails project={project} user={user} />
    </AppShell>
  );
}
