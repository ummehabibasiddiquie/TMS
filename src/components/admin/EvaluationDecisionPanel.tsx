"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bandBadgeClass,
  bandRowClass,
  type EvaluationBandInfo,
} from "@/lib/evaluation";
import { CalendarPlus, CheckCircle2, XCircle } from "lucide-react";

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
};

type Props = {
  /** When true, show Reject / Approve / +1 week (Admin only). */
  canDecide?: boolean;
};

export function EvaluationDecisionPanel({ canDecide = false }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/curriculum/progress");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setError("");
    const all: Row[] = (data.trainees || []).map(
      (t: Row & { overallPercent?: number }) => t
    );
    // Show trainees who finished schedule, took the quiz, or already decided
    const relevant = all.filter(
      (t) =>
        t.scheduleComplete ||
        t.finalQuizScore != null ||
        t.trainingStatus === "REJECTED" ||
        t.trainingStatus === "APPROVED_IN_ORG" ||
        t.readyForProduction
    );
    setRows(relevant);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(traineeId: string, name: string, action: string) {
    const labels: Record<string, string> = {
      reject: `Reject ${name}? Their account will be deactivated.`,
      approve: `Approve ${name} into the org? Requires ≥90% on the final quiz.`,
      extendWeek: `Add +1 week for ${name}? The Extra week default schedule will be copied to their personal plan (Team Lead can edit it). They also get one new final-quiz attempt after those days.`,
    };
    if (!confirm(labels[action] || "Confirm?")) return;

    setBusyId(traineeId);
    setMsg("");
    const res = await fetch(`/api/admin/trainees/${traineeId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMsg(data.error || "Action failed");
      return;
    }
    setMsg(
      action === "reject"
        ? `${name} rejected and deactivated.`
        : action === "approve"
          ? `${name} approved into the org.`
          : `Extra week added for ${name}.`
    );
    await load();
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading evaluation board…</p>;
  }
  if (error) return <p className="text-sm text-amber-300">{error}</p>;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Evaluation review</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          After day-wise training, review schedule completion, HRMS practice-work quality/hours, and
          the one-attempt final quiz together.
          {canDecide
            ? " Admin may reject, add +1 week, or approve (≥90% quiz required to approve)."
            : " Team Lead: view only — Admin makes the hire decision."}
        </p>
      </div>

      {msg && (
        <p className="rounded-xl bg-blue-500/10 px-3 py-2 text-sm text-blue-200">{msg}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No trainees awaiting evaluation yet. They appear when the schedule is complete.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Trainee</th>
                <th className="px-3 py-2 font-medium">Final quiz</th>
                <th className="px-3 py-2 font-medium">Band</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canDecide && <th className="px-3 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone = r.band?.tone ?? "muted";
                const decided =
                  r.trainingStatus === "REJECTED" ||
                  r.trainingStatus === "APPROVED_IN_ORG" ||
                  r.readyForProduction;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-800 ${bandRowClass(tone)}`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-100">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.finalQuizScore != null ? (
                        <span
                          className={
                            tone === "red"
                              ? "text-lg font-semibold text-red-300"
                              : tone === "emerald"
                                ? "text-lg font-semibold text-emerald-300"
                                : "text-lg font-semibold text-amber-200"
                          }
                        >
                          {r.finalQuizScore}%
                        </span>
                      ) : (
                        <span className="text-slate-500">Not taken</span>
                      )}
                      {r.finalQuizAttemptedAt && (
                        <p className="text-[11px] text-slate-500">
                          {new Date(r.finalQuizAttemptedAt).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${bandBadgeClass(tone)}`}
                      >
                        {r.band?.label ?? "Pending"}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {r.band?.description}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">
                      {r.trainingStatus === "APPROVED_IN_ORG" || r.readyForProduction
                        ? "Approved in org"
                        : r.trainingStatus === "REJECTED"
                          ? "Rejected"
                          : r.scheduleComplete
                            ? "Awaiting decision"
                            : r.trainingStatus || "—"}
                    </td>
                    {canDecide && (
                      <td className="px-3 py-2.5">
                        {!decided && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => decide(r.id, r.name, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-800/60 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:bg-red-900/50 disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                            {(r.band?.band === "ATTENTION" ||
                              r.band?.band === "REJECT" ||
                              (r.finalQuizScore != null && r.finalQuizScore < 90) ||
                              (r.scheduleComplete && r.finalQuizScore == null)) && (
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => decide(r.id, r.name, "extendWeek")}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-xs text-amber-200 hover:bg-amber-900/50 disabled:opacity-50"
                              >
                                <CalendarPlus className="h-3 w-3" />
                                +1 week
                              </button>
                            )}
                            {r.finalQuizScore != null && r.finalQuizScore >= 90 && (
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => decide(r.id, r.name, "approve")}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve to org
                              </button>
                            )}
                          </div>
                        )}
                        {decided && (
                          <span className="text-[11px] text-slate-600">Decision recorded</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
