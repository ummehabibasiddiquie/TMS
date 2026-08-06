"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2, UserCheck, UserX } from "lucide-react";
import { type EvaluationBandInfo } from "@/lib/evaluation";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";
import { formatRole } from "@/lib/roles";

type Row = {
  id: string;
  name: string;
  email: string;
  scheduleComplete: boolean;
  trainingStatus: string | null;
  readyForProduction?: boolean;
  finalQuizScore: number | null;
  finalQuizAttemptedAt: string | null;
  band: EvaluationBandInfo;
  evaluationCycle: number;
  previousQuizAttempts?: { cycle: number; score: number; createdAt: string }[];
  quizRetakePending?: boolean;
  quizRetakeGrantedAt?: string | null;
  quizRetakeGrantedBy?: { id: string; name: string; role: string } | null;
  lastFinalQuizScore?: number | null;
  finalQuizCertificateStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  workSummary?: {
    hoursLogged: number | null;
    productionUnits: number | null;
    entries: number;
    qualityScore: number | null;
  } | null;
};

const panelShell =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none";

function formatPrevScores(attempts?: { cycle: number; score: number }[]) {
  if (!attempts?.length) return null;
  return attempts.map((a) => `C${a.cycle}: ${a.score}%`).join(" · ");
}

function statusLabel(r: Row) {
  if (r.trainingStatus === "APPROVED_IN_ORG" || r.readyForProduction) return "Hired";
  if (r.trainingStatus === "REJECTED") return "Not hired";
  if (r.scheduleComplete) return "Waiting for decision";
  return r.trainingStatus || "In progress";
}

function statusBadgeClass(r: Row) {
  if (r.trainingStatus === "APPROVED_IN_ORG" || r.readyForProduction) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (r.trainingStatus === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }
  if (r.scheduleComplete) {
    return "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

function quizScoreClass(score: number | null) {
  if (score == null) return "text-slate-500";
  if (score >= 90) return "text-emerald-700 dark:text-emerald-300";
  if (score >= 70) return "text-amber-800 dark:text-amber-200";
  return "text-red-700 dark:text-red-300";
}

const btnSecondary =
  "inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800";

export function EvaluationDecisionPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState("");

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await fetch("/api/curriculum/progress");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      setError("");
      const all: Row[] = (data.trainees || []).map(
        (t: Row & { overallPercent?: number }) => t
      );
      const relevant = all.filter(
        (t) =>
          t.scheduleComplete ||
          t.finalQuizScore != null ||
          (t.previousQuizAttempts?.length ?? 0) > 0 ||
          t.quizRetakePending ||
          t.trainingStatus === "REJECTED" ||
          t.trainingStatus === "APPROVED_IN_ORG" ||
          t.readyForProduction
      );
      setRows(relevant);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(traineeId: string, name: string, action: string) {
    let days: number | undefined;
    if (action === "extendWeek") {
      const raw = prompt(
        `How many extra days for ${name}?\n7 = one week, 14 = two weeks. Max 60.`,
        "7"
      );
      if (raw == null) return;
      days = Number(raw.trim());
      if (!Number.isFinite(days) || days < 1 || days > 60) {
        setMsg("Enter a number of days between 1 and 60");
        return;
      }
    }

    const labels: Record<string, string> = {
      reject: `Mark ${name} as not hired and deactivate their account?`,
      approve: `Hire ${name} into the organization?\n\nRequires final quiz ≥90%.`,
      extendWeek: `Add ${days} day${days === 1 ? "" : "s"} for ${name}?`,
      approveCertificate: `Approve ${name}'s final quiz certificate?\n\nThey can view it on Certificates.`,
    };
    if (!confirm(labels[action] || "Confirm?")) return;

    setBusyId(traineeId);
    setBusyLabel(
      action === "extendWeek"
        ? `Adding ${days} day${days === 1 ? "" : "s"} for ${name}…`
        : action === "approve"
          ? `Hiring ${name}…`
          : action === "approveCertificate"
            ? `Approving certificate for ${name}…`
            : `Updating ${name}…`
    );
    setMsg("");
    try {
      const res = await fetch(`/api/admin/trainees/${traineeId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "extendWeek" ? { days } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Action failed");
        return;
      }
      setBusyLabel("Refreshing…");
      await load({ quiet: true });
      setMsg(
        action === "reject"
          ? `${name} marked not hired and deactivated.`
          : action === "approve"
            ? `${name} hired into the org.`
            : action === "approveCertificate"
              ? `Certificate approved for ${name}.`
              : data.fromDay != null
                ? `Added ${data.added ?? days} day(s) for ${name} (Days ${data.fromDay}–${data.toDay}).`
                : `Added ${days} day(s) for ${name}.`
      );
    } finally {
      setBusyId(null);
      setBusyLabel("");
    }
  }

  if (loading && rows.length === 0) {
    return (
      <section className={`${panelShell} p-6`}>
        <SectionLoader message="Loading hire decisions…" />
      </section>
    );
  }
  if (error && rows.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
        {error}
      </p>
    );
  }

  return (
    <section className={panelShell}>
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hire decisions</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          When training is complete, choose <strong className="font-medium">Hire</strong> (quiz ≥
          90%) or <strong className="font-medium">Do not hire</strong>. Use Add days when someone
          needs more training time. The final quiz allows one attempt only. Certificate approval is
          separate from hiring.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {busyLabel && <WorkingBanner message={busyLabel} />}
        {msg && !busyLabel && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
            {msg}
          </p>
        )}

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-500">
            No trainees ready for a hire decision yet.
          </p>
        ) : (
          <div
            className={`min-w-0 space-y-3 ${busyId ? "pointer-events-none opacity-70" : ""}`}
          >
            {rows.map((r) => {
              const decided =
                r.trainingStatus === "REJECTED" ||
                r.trainingStatus === "APPROVED_IN_ORG" ||
                r.readyForProduction;
              const work = r.workSummary;
              const quiz = r.finalQuizScore;
              const prevScores = formatPrevScores(r.previousQuizAttempts);
              const rowBusy = busyId === r.id;
              const certPending =
                r.finalQuizCertificateStatus === "PENDING_REVIEW" && quiz != null;
              const canHire = quiz != null && quiz >= 90;
              const showExtend =
                !decided &&
                (r.band?.band === "ATTENTION" ||
                  r.band?.band === "REJECT" ||
                  (quiz != null && quiz < 90) ||
                  (r.scheduleComplete && quiz == null));

              return (
                <article
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {rowBusy && (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3>
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(r)}`}
                        >
                          {statusLabel(r)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{r.email}</p>
                      <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-500">
                            Production
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            {work?.productionUnits != null ? work.productionUnits : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-500">
                            Quality
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            {work?.qualityScore != null ? `${work.qualityScore}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-500">Quiz</p>
                          <p className={`text-sm font-semibold tabular-nums ${quizScoreClass(quiz)}`}>
                            {quiz == null ? "—" : `${Math.round(quiz)}%`}
                          </p>
                          {prevScores && (
                            <p className="text-[10px] tabular-nums text-slate-500">
                              Previous {prevScores}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-500">
                        {certPending && (
                          <span className="text-amber-800 dark:text-amber-300">Certificate pending review</span>
                        )}
                        {r.finalQuizCertificateStatus === "APPROVED" && quiz != null && (
                          <span className="text-emerald-800 dark:text-emerald-400">
                            Certificate approved
                          </span>
                        )}
                        {r.band?.label && (
                          <span>{r.band.label}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 lg:min-w-[220px]">
                      {decided ? (
                        <p className="text-sm text-slate-600 dark:text-slate-500">
                          Decision recorded — no further actions.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Decision
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!!busyId || !canHire}
                              title={
                                canHire
                                  ? "Hire into the organization"
                                  : "Requires final quiz score ≥ 90%"
                              }
                              onClick={() => decide(r.id, r.name, "approve")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Hire
                            </button>
                            <button
                              type="button"
                              disabled={!!busyId}
                              onClick={() => decide(r.id, r.name, "reject")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/40"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Do not hire
                            </button>
                          </div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 pt-1">
                            Other
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {showExtend && (
                              <button
                                type="button"
                                disabled={!!busyId}
                                onClick={() => decide(r.id, r.name, "extendWeek")}
                                className={btnSecondary}
                              >
                                <CalendarPlus className="h-3 w-3" />
                                Add days
                              </button>
                            )}
                            {certPending && (
                              <button
                                type="button"
                                disabled={!!busyId}
                                onClick={() => decide(r.id, r.name, "approveCertificate")}
                                className={btnSecondary}
                              >
                                Approve certificate
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
