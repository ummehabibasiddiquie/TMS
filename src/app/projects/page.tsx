import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { projects } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Project List</p>
          <h1 className="mt-3 text-3xl font-bold text-white">All projects you are enrolled in</h1>
          <p className="mt-2 text-slate-400">Complete training and quiz to get certified for each project.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div key={project.key} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="flex gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
                    project.available ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  )}
                >
                  {project.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      {project.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{project.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-300">{project.status}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">{project.detail}</span>
                    {project.progress && (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
                        {project.progress}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {project.available && (
                <Link
                  href="/projects/landscape/train"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Open Training
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
