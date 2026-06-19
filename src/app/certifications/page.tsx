import { redirect } from "next/navigation";
import { Award, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";

export default async function CertificationsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const certifications = await prisma.projectCertification.findMany({
    where: { userId: user.id, passed: true },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
    orderBy: { certifiedAt: "desc" },
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
          {certifications.length === 0 ? (
            <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-slate-400">No certifications yet. Complete project quizzes to earn badges.</p>
            </div>
          ) : (
            certifications.map((certification: any) => (
              <div key={certification.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{certification.project.name}</h2>
                    <p className="text-sm text-slate-500">{certification.project.category || "General"}</p>
                    <p className="mt-3 text-sm text-slate-300">
                      Certified - issued {new Date(certification.certifiedAt).toLocaleDateString()} - score {Math.round(certification.score * 100)}%
                    </p>
                  </div>
                </div>
                <button className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
                  <Download className="h-4 w-4" />
                  Download Certificate PDF
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
