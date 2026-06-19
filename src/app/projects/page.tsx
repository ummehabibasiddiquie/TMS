import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

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

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Project List</p>
          <h1 className="mt-3 text-3xl font-bold text-white">All projects you are enrolled in</h1>
          <p className="mt-2 text-slate-400">Complete training and quiz to get certified for each project.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      </div>
    </AppShell>
  );
}
