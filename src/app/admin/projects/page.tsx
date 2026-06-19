import { redirect } from "next/navigation";
import { Plus, FolderKanban, Users, Award } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectManager } from "@/components/projects/ProjectManager";

export default async function AdminProjectsPage() {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          assignments: true,
          certifications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as any[];

  const totalAssignments = projects.reduce((sum: number, p: any) => sum + p._count.assignments, 0);
  const totalCertifications = projects.reduce((sum: number, p: any) => sum + p._count.certifications, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Admin - Project Management
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            Manage Projects
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Create, edit, and manage training projects for employees.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <FolderKanban className="h-5 w-5 text-blue-300" />
          <p className="mt-3 text-sm text-slate-400">Total Projects</p>
          <p className="mt-1 text-3xl font-bold text-white">{projects.length}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <Users className="h-5 w-5 text-blue-300" />
          <p className="mt-3 text-sm text-slate-400">Total Assignments</p>
          <p className="mt-1 text-3xl font-bold text-white">{totalAssignments}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <Award className="h-5 w-5 text-blue-300" />
          <p className="mt-3 text-sm text-slate-400">Certifications</p>
          <p className="mt-1 text-3xl font-bold text-white">{totalCertifications}</p>
        </div>
      </div>

      <ProjectManager initialProjects={projects} />
    </div>
  );
}
