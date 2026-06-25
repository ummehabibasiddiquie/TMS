import { redirect } from "next/navigation";
import { Award, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";

export default async function CertificationsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { active: true },
    include: {
      categoryRel: {
        select: {
          id: true,
          name: true,
        },
      },
      certifications: {
        where: { userId: user.id },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">My Certifications</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Project certification badges</h1>
          <p className="mt-2 text-slate-400">
            Certifications are awarded automatically after passing each project quiz with 80% or higher.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const certified = project.certifications.length > 0 && project.certifications[0].passed;
            const certification = project.certifications[0];
            return (
              <div key={project.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
                    {certified ? <Award className="h-6 w-6" /> : project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{project.name}</h2>
                    <p className="text-sm text-slate-500">{project.categoryRel?.name || "Uncategorized"}</p>
                    <p className="mt-3 text-sm text-slate-300">
                      {certified 
                        ? `Certified - issued ${new Date(certification.certifiedAt).toLocaleDateString()} - score ${certification.score.toFixed(1)} / 5` 
                        : "Coming Soon - training not yet available"}
                    </p>
                  </div>
                </div>
                <button className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
                  <Download className="h-4 w-4" />
                  Download Certificate PDF
                </button>
              </div>
            ))
          })}
        </div>
      </div>
    </AppShell>
  );
}
