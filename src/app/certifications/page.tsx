"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, FolderKanban, Calendar, Trophy, Download, Eye, Clock, XCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/format-date";
import { formatCertActionBy } from "@/lib/cert-reviewer";
import { AppShell } from "@/components/layout/AppShell";
import {
  CertificateModal,
  type CertificateData,
} from "@/components/certifications/CertificateDocument";
import { printCertificate } from "@/lib/print-certificate";
import {
  DEFAULT_CERTIFICATE_BRAND,
  type CertificateBrandSettings,
} from "@/lib/certificate-brand";
import type { Role } from "@/types";

export const dynamic = "force-dynamic";

type CertReviewer = { id: string; name: string; role: string };

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
    status?: string;
    certifiedAt: string | Date;
    score: number;
    reviewNote?: string | null;
    reviewedBy?: CertReviewer | null;
  }[];
};

function certStatus(project: Project) {
  const c = project.certifications[0];
  if (!c) return "NONE";
  // Strict: downloadable only after Admin / Team Lead approval
  if (c.status === "APPROVED") return "APPROVED";
  if (c.status === "PENDING_REVIEW") return "PENDING_REVIEW";
  if (c.status === "REJECTED") return "REJECTED";
  if (c.status === "FAILED") return "FAILED";
  // Legacy rows without status: treat passed quiz as pending approval (not certified)
  if (c.passed) return "PENDING_REVIEW";
  return "FAILED";
}

type FinalQuizCert = {
  id: string;
  quizTitle: string;
  score: number;
  cycle: number;
  status: string;
  certifiedAt: string | Date;
  reviewNote?: string | null;
  reviewedBy?: CertReviewer | null;
};

export default function CertificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: Role; email: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [finalQuizCerts, setFinalQuizCerts] = useState<FinalQuizCert[]>([]);
  const [pendingFinalQuiz, setPendingFinalQuiz] = useState<FinalQuizCert | null>(null);
  const [rejectedFinalQuiz, setRejectedFinalQuiz] = useState<FinalQuizCert | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCert, setActiveCert] = useState<CertificateData | null>(null);
  const [brand, setBrand] = useState<CertificateBrandSettings>(
    DEFAULT_CERTIFICATE_BRAND
  );

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
      const [certRes, brandRes] = await Promise.all([
        fetch("/api/certifications"),
        fetch("/api/certificate-brand"),
      ]);
      const data = await certRes.json();
      if (certRes.ok) {
        setProjects(data.projects || []);
        setFinalQuizCerts(data.finalQuizCertificates || []);
        setPendingFinalQuiz(data.pendingFinalQuizCertificate || null);
        setRejectedFinalQuiz(data.rejectedFinalQuizCertificate || null);
      }
      const brandData = await brandRes.json();
      if (brandRes.ok && brandData.brand) setBrand(brandData.brand);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  if (loading) {
    return (
      <AppShell user={user || { name: "", email: "", role: "TRAINEE" }}>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!user) return null;

  const certifiedProjects = projects.filter((p) => certStatus(p) === "APPROVED");
  const pendingReviewProjects = projects.filter((p) => certStatus(p) === "PENDING_REVIEW");
  const rejectedProjects = projects.filter((p) => certStatus(p) === "REJECTED");
  const inProgressProjects = projects.filter((p) => {
    const s = certStatus(p);
    return s === "NONE" || s === "FAILED";
  });
  const approvedFinalQuiz = finalQuizCerts.filter((c) => c.status === "APPROVED");

  function toCertData(project: Project): CertificateData | null {
    const certification = project.certifications[0];
    if (!certification || certStatus(project) !== "APPROVED" || !user) return null;
    return {
      recipientName: user.name,
      projectName: project.name,
      categoryName: project.categoryRel?.name,
      score: certification.score,
      certifiedAt: certification.certifiedAt,
      certificateId: certification.id,
      kind: "project",
    };
  }

  function toFinalQuizCertData(cert: FinalQuizCert): CertificateData | null {
    if (!user || cert.status !== "APPROVED") return null;
    return {
      recipientName: user.name,
      projectName: cert.quizTitle || "Final Quiz",
      categoryName: "Final Quiz",
      score: cert.score,
      certifiedAt: cert.certifiedAt,
      certificateId: cert.id,
      kind: "final_quiz",
    };
  }

  function openCertificate(project: Project) {
    const data = toCertData(project);
    if (data) setActiveCert(data);
  }

  function downloadCertificate(project: Project) {
    const data = toCertData(project);
    if (data) printCertificate(data, brand);
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            My Certificates
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificates</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Final Quiz certificate appears after Admin or Team Lead approval. Project certificates
            need Admin or Team Lead approval before view or download.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {[
            {
              icon: Trophy,
              label: "Certified",
              value: certifiedProjects.length + approvedFinalQuiz.length,
            },
            { icon: Clock, label: "Pending review", value: pendingReviewProjects.length + (pendingFinalQuiz ? 1 : 0) },
            {
              icon: XCircle,
              label: "Not approved",
              value: rejectedProjects.length + (rejectedFinalQuiz ? 1 : 0),
            },
            { icon: FolderKanban, label: "Not yet certified", value: inProgressProjects.length },
            { icon: Award, label: "Assigned projects", value: projects.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="rounded-lg bg-slate-800 p-3">
                <stat.icon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {pendingFinalQuiz && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Pending review</h3>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-600/80 text-white">
                  <Clock className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    {pendingFinalQuiz.quizTitle || "Final Quiz"}
                  </h2>
                  <p className="text-sm text-slate-400">Final Quiz</p>
                  <p className="mt-2 text-sm text-amber-100">
                    Quiz score: {Math.round(pendingFinalQuiz.score)}%. Approval is pending from
                    Admin or Team Lead. You cannot view or download the certificate until it is approved.
                  </p>
                  <span className="mt-3 inline-block rounded-md bg-amber-500/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                    Pending approval
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {rejectedFinalQuiz && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Certificate not approved</h3>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-rose-600/80 text-white">
                  <XCircle className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    {rejectedFinalQuiz.quizTitle || "Final Quiz"}
                  </h2>
                  <p className="text-sm text-slate-400">Final Quiz</p>
                  <p className="mt-2 text-sm text-rose-100">
                    Your quiz score was {Math.round(rejectedFinalQuiz.score)}%. Admin or Team Lead
                    did not approve this certificate for cycle {rejectedFinalQuiz.cycle}. You
                    cannot view or download it. Final quiz retakes are not available.
                  </p>
                  {rejectedFinalQuiz.reviewNote && (
                    <p className="mt-3 rounded-md bg-rose-950/40 px-3 py-2 text-sm text-rose-50">
                      <span className="font-medium">Reason: </span>
                      {rejectedFinalQuiz.reviewNote}
                    </p>
                  )}
                  {formatCertActionBy("rejected", rejectedFinalQuiz.reviewedBy) && (
                    <p className="mt-2 text-xs text-rose-200/90">
                      {formatCertActionBy("rejected", rejectedFinalQuiz.reviewedBy)}
                    </p>
                  )}
                  <span className="mt-3 inline-block rounded-md bg-rose-500/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100">
                    Not approved
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {approvedFinalQuiz.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Final Quiz certificate</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {approvedFinalQuiz.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
                      <Award className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-white">
                        {cert.quizTitle || "Final Quiz"}
                      </h2>
                      <p className="text-sm text-slate-400">Final Quiz</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-amber-400" />
                          Score: {Math.round(cert.score)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          {formatDisplayDate(cert.certifiedAt)}
                        </span>
                      </div>
                      {formatCertActionBy("approved", cert.reviewedBy) && (
                        <p className="mt-2 text-xs text-amber-200/90">
                          {formatCertActionBy("approved", cert.reviewedBy)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const data = toFinalQuizCertData(cert);
                        if (data) setActiveCert(data);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const data = toFinalQuizCertData(cert);
                        if (data) printCertificate(data, brand);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-700/50 px-3 py-2 text-sm text-amber-100 hover:bg-amber-950/40"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {certifiedProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Project certificates</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {certifiedProjects.map((project) => {
                const certification = project.certifications[0];
                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <Award className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                        <p className="text-sm text-slate-400">
                          {project.categoryRel?.name || "Uncategorized"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-emerald-400" />
                            Score: {Math.round(certification.score)}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-emerald-400" />
                            {formatDisplayDate(certification.certifiedAt)}
                          </span>
                        </div>
                        {formatCertActionBy("approved", certification.reviewedBy) && (
                          <p className="mt-2 text-xs text-emerald-200/90">
                            {formatCertActionBy("approved", certification.reviewedBy)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCertificate(project)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        <Eye className="h-4 w-4" />
                        View certificate
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadCertificate(project)}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingReviewProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Pending review</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {pendingReviewProjects.map((project) => {
                const certification = project.certifications[0];
                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-600/80 text-white">
                        <Clock className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                        <p className="text-sm text-slate-400">
                          {project.categoryRel?.name || "Uncategorized"}
                        </p>
                        <p className="mt-2 text-sm text-amber-100">
                          Quiz score: {Math.round(certification.score)}%. Approval is pending from
                          your Team Lead or Admin. You cannot view or download the certificate until
                          it is approved.
                        </p>
                        <span className="mt-3 inline-block rounded-md bg-amber-500/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                          Pending approval
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rejectedProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Certificate not approved</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedProjects.map((project) => {
                const certification = project.certifications[0];
                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-rose-600/80 text-white">
                        <XCircle className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                        <p className="text-sm text-slate-400">
                          {project.categoryRel?.name || "Uncategorized"}
                        </p>
                        <p className="mt-2 text-sm text-rose-100">
                          Quiz score: {Math.round(certification.score)}%. Admin or Team Lead did not
                          approve this certificate. Retake the project quiz when ready, then wait for
                          review again.
                        </p>
                        {certification.reviewNote && (
                          <p className="mt-3 rounded-md bg-rose-950/40 px-3 py-2 text-sm text-rose-50">
                            <span className="font-medium">Reason: </span>
                            {certification.reviewNote}
                          </p>
                        )}
                        {formatCertActionBy("rejected", certification.reviewedBy) && (
                          <p className="mt-2 text-xs text-rose-200/90">
                            {formatCertActionBy("rejected", certification.reviewedBy)}
                          </p>
                        )}
                        <span className="mt-3 inline-block rounded-md bg-rose-500/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100">
                          Not approved
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/projects/${project.id}/quiz`}
                        className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                      >
                        Retake Project Quiz
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {inProgressProjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Assigned — not certified yet</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressProjects.map((project) => {
                const certification = project.certifications[0];
                const status = certStatus(project);
                return (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl font-bold text-slate-400">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                      <p className="text-sm text-slate-500">
                        {project.categoryRel?.name || "Uncategorized"}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {status === "FAILED" && certification
                          ? `Last score: ${Math.round(certification.score)}%. Score 80%+ then wait for approval.`
                          : "Complete training and pass the project quiz (80%+). Admin or Team Lead must approve before you are certified."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/projects/${project.id}/quiz`}
                      className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      {certification ? "Retake Project Quiz" : "Take Project Quiz"}
                    </Link>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <Award className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No assigned projects</h3>
            <p className="mt-2 text-slate-400">
              When Admin or Team Lead assigns you a project, it will show up here.
            </p>
          </div>
        )}
      </div>

      <CertificateModal
        data={activeCert}
        open={Boolean(activeCert)}
        onClose={() => setActiveCert(null)}
        brand={brand}
      />
    </AppShell>
  );
}
