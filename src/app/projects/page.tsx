import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

<<<<<<< HEAD
  const projects = await prisma.project.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          certifications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as any[];

  const isCertified = (projectId: string) => {
    const project = projects.find((p: any) => p.id === projectId);
    return project?._count?.certifications > 0;
  };
=======
  let projects;

  if (user.role === "ADMIN" || user.role === "TRAINER") {
    projects = await prisma.project.findMany({
      where: { active: true },
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
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    const assignments = await prisma.projectAssignment.findMany({
      where: { userId: user.id },
      include: {
        project: {
          where: { active: true },
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
          },
        },
      },
    });

    projects = assignments
      .map((a) => a.project)
      .filter((p) => p !== null);
  }
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Project List</p>
            <h1 className="mt-3 text-3xl font-bold text-white">
              {user.role === "ADMIN" || user.role === "TRAINER"
                ? "All Projects"
                : "Your Assigned Projects"}
            </h1>
            <p className="mt-2 text-slate-400">
              {user.role === "ADMIN" || user.role === "TRAINER"
                ? "Manage and assign projects to team members."
                : "Complete training and quiz to get certified for each project."}
            </p>
          </div>
          {(user.role === "ADMIN" || user.role === "TRAINER") && (
            <Link
              href="/admin/projects"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Manage Projects
            </Link>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
<<<<<<< HEAD
          {projects.map((project) => {
            const isAvailable = project.status === "ACTIVE";
            const initial = project.name.charAt(0).toUpperCase();
            const statusText = project.status === "ACTIVE" ? "Training available" : project.status.replace("_", " ");
            const detailText = isCertified(project.id) ? "Certified" : "Quiz pending";
            
            return (
              <div key={project.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
                      isAvailable ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {initial}
=======
          {projects.length === 0 ? (
            <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-slate-400">
                {user.role === "ADMIN" || user.role === "TRAINER"
                  ? "No projects found. Create your first project to get started."
                  : "No projects assigned to you yet."}
              </p>
            </div>
          ) : (
            projects.map((project: any) => (
              <div key={project.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
                    {project.name.charAt(0).toUpperCase()}
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                      {project.category && (
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                          {project.category}
                        </span>
                      )}
                    </div>
<<<<<<< HEAD
                    <p className="mt-2 text-sm text-slate-400">{project.description || "No description available"}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className={cn(
                        "rounded-full px-3 py-1",
                        isAvailable ? "bg-blue-500/15 text-blue-300" : "bg-amber-500/15 text-amber-300"
                      )}>
                        {statusText}
                      </span>
                      <span className={cn(
                        "rounded-full px-3 py-1",
                        isCertified(project.id) ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-300"
                      )}>
                        {detailText}
                      </span>
                    </div>
                  </div>
                </div>
                {isAvailable && (
                  <Link
                    href={`/projects/${project.name.toLowerCase().replace(/\s+/g, '-')}/train`}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Open Training
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
=======
                    <p className="mt-2 text-sm text-slate-400">{project.description || "No description"}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1",
                          project.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-800 text-slate-300"
                        )}
                      >
                        {project.status}
                      </span>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                        Priority: {project.priority}
                      </span>
                      {project.startDate && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                          Start: {new Date(project.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/projects/${project.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))
          )}
>>>>>>> df682e453fa3568f70421d3b37f82abb7169616c
        </div>
      </div>
    </AppShell>
  );
}
