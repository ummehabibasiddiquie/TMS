"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Award, Download, FolderKanban, Calendar, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressRing } from "@/components/learning/ProgressRing";
import type { Role } from "@/types";

type Project = {
  id: string;
  name: string;
  categoryRel: {
    id: string;
    name: string;
  } | null;
  certifications: {
    id: string;
    passed: boolean;
    certifiedAt: Date;
    score: number;
  }[];
};

export default function CertificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: Role; email: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        fetchProjects();
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/certifications");
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  if (loading) {
    return (
      <AppShell user={user || { name: "", email: "", role: "TRAINEE" }}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  const certifiedProjects = projects.filter((p) => p.certifications.length > 0 && p.certifications[0].passed);
  const inProgressProjects = projects.filter((p) => p.certifications.length === 0 || !p.certifications[0].passed);

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

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Trophy,
              label: "Certified",
              value: certifiedProjects.length,
              color: "emerald",
            },
            {
              icon: FolderKanban,
              label: "In Progress",
              value: inProgressProjects.length,
              color: "blue",
            },
            {
              icon: Award,
              label: "Total Projects",
              value: projects.length,
              color: "slate",
            },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel flex items-center gap-4 p-5">
              <div className={`rounded-xl bg-${stat.color}-600/20 p-3`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Certified Projects */}
        {certifiedProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Earned Certifications</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {certifiedProjects.map((project) => {
                const certification = project.certifications[0];
                return (
                  <div key={project.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-600 text-2xl font-bold text-white">
                        <Award className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-semibold text-white text-lg">{project.name}</h2>
                        <p className="text-sm text-slate-400">{project.categoryRel?.name || "Uncategorized"}</p>
                        <div className="mt-3 flex gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-300">
                            <Trophy className="h-4 w-4 text-emerald-400" />
                            <span>Score: {certification.score.toFixed(1)}/5</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-300">
                            <Calendar className="h-4 w-4 text-emerald-400" />
                            <span>{new Date(certification.certifiedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                        <Download className="h-4 w-4" />
                        Download Certificate
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20">
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* In Progress Projects */}
        {inProgressProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">In Progress</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressProjects.map((project) => (
                <div key={project.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <div className="flex gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-800 text-2xl font-bold text-slate-400">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-white text-lg">{project.name}</h2>
                      <p className="text-sm text-slate-500">{project.categoryRel?.name || "Uncategorized"}</p>
                      <p className="mt-3 text-sm text-slate-400">
                        Training in progress - complete the course and pass the quiz to earn certification
                      </p>
                    </div>
                  </div>
                  <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                    Continue Learning
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
            <Award className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No certifications yet</h3>
            <p className="mt-2 text-slate-400">Complete your assigned projects to earn certifications.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
