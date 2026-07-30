"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Check,
  Clock,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { formatDisplayDateTime } from "@/lib/format-date";
import { formatCertActionBy, formatCertActionByOrUnknown } from "@/lib/cert-reviewer";
import type { CertHistoryEntry } from "@/lib/certification-history";

type PendingCert = {
  id: string;
  kind: "project" | "final_quiz";
  score: number;
  status: string;
  submittedAt: string;
  cycle?: number;
  quizTitle?: string;
  canAllowRetake?: boolean;
  reviewNote?: string | null;
  user: { id: string; name: string; email: string; employeeId: string | null };
  project?: { id: string; name: string; categoryRel: { name: string } | null };
};

type RetakeAwaiting = {
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  employeeId: string | null;
  previousScore: number | null;
  evaluationCycle: number;
  grantedAt: string;
  grantedBy: { id: string; name: string; role: string } | null;
};

type Stats = {
  pending: number;
  retakeAwaiting?: number;
  approved: number;
  rejected: number;
  total?: number;
};

type HistoryFilter = "all" | "pending" | "approved" | "rejected" | "retakes";

function eventTone(event: CertHistoryEntry["event"]) {
  switch (event) {
    case "approved":
      return "bg-emerald-500/20 text-emerald-200";
    case "rejected":
      return "bg-rose-500/20 text-rose-200";
    case "pending":
      return "bg-amber-500/20 text-amber-200";
    case "retake_granted":
    case "retake_open":
      return "bg-violet-500/20 text-violet-200";
    case "superseded":
      return "bg-slate-500/20 text-slate-300";
    default:
      return "bg-slate-500/20 text-slate-300";
  }
}

function actorTone(event: CertHistoryEntry["event"]) {
  switch (event) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-100";
    case "rejected":
      return "bg-rose-500/10 text-rose-100";
    case "retake_granted":
    case "retake_open":
    case "superseded":
      return "bg-violet-500/10 text-violet-100";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

function kindLabel(kind: CertHistoryEntry["kind"]) {
  if (kind === "final_quiz") return "Final Quiz";
  if (kind === "project") return "Project";
  return "Retake";
}

function historyActorEvent(row: CertHistoryEntry): Parameters<typeof formatCertActionBy>[0] {
  if (row.kind === "retake_grant") {
    return row.event === "retake_open" ? "retake_open" : "retake_granted";
  }
  return row.event;
}

export function CertificationApprovalsManager() {
  const [items, setItems] = useState<PendingCert[]>([]);
  const [retakeAwaiting, setRetakeAwaiting] = useState<RetakeAwaiting[]>([]);
  const [history, setHistory] = useState<CertHistoryEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/certifications/pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.certifications || []);
      setRetakeAwaiting(data.retakeAwaiting || []);
      setHistory(data.history || []);
      setStats(data.stats || { pending: 0, retakeAwaiting: 0, approved: 0, rejected: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredHistory = useMemo(() => {
    switch (historyFilter) {
      case "pending":
        return history.filter((e) => e.event === "pending");
      case "approved":
        return history.filter((e) => e.event === "approved");
      case "rejected":
        return history.filter((e) => e.event === "rejected");
      case "retakes":
        return history.filter(
          (e) =>
            e.kind === "retake_grant" ||
            e.event === "superseded" ||
            e.event === "retake_granted" ||
            e.event === "retake_open"
        );
      default:
        return history;
    }
  }, [history, historyFilter]);

  async function allowRetake(traineeId: string, traineeName: string, certId: string) {
    const cert =
      items.find((i) => i.id === certId) ??
      history.find((h) => h.certId === certId);
    const score = cert?.score ?? items.find((i) => i.id === certId)?.score ?? 0;
    if (
      !confirm(
        `Allow ${traineeName} to retake the final quiz?\n\nTheir ${Math.round(
          typeof score === "number" ? score : 0
        )}% score stays on record. They get one new attempt.`
      )
    ) {
      return;
    }
    setActingId(`retake-${traineeId}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/trainees/${traineeId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allowRetake" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not allow retake");
      await load();
      setMessage(
        `${traineeName} may retake the final quiz (cycle ${data.newCycle ?? "next"}). Previous score: ${data.previousScore ?? "—"}%.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not allow retake");
    } finally {
      setActingId(null);
    }
  }

  async function review(
    id: string,
    action: "APPROVE" | "REJECT",
    kind: "project" | "final_quiz",
    opts?: { reversing?: boolean; traineeName?: string }
  ) {
    if (action === "APPROVE" && opts?.reversing) {
      if (
        !confirm(
          `Approve this certificate for ${opts.traineeName ?? "this trainee"}?\n\nThey will be able to view and download it.`
        )
      ) {
        return;
      }
    }

    if (action === "REJECT" && opts?.reversing) {
      if (
        !confirm(
          `Reject this previously approved certificate for ${opts.traineeName ?? "this trainee"}?\n\nThey will lose access until it is approved again.`
        )
      ) {
        return;
      }
    }

    let reviewNote: string | undefined;
    if (action === "REJECT") {
      const raw = prompt(
        "Reason for rejection (required — the trainee will see this):"
      );
      if (raw == null) return;
      reviewNote = raw.trim();
      if (reviewNote.length < 3) {
        setError("Please enter a rejection reason (at least 3 characters).");
        return;
      }
    }

    setActingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, kind, ...(reviewNote ? { reviewNote } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await load();
      setMessage(
        action === "APPROVE"
          ? opts?.reversing
            ? "Certificate approved — trainee can access it again."
            : "Certificate approved."
          : opts?.reversing
            ? "Certificate rejected — trainee access removed."
            : "Certificate rejected."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Certification review
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificates &amp; quiz history</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Admin and Team Lead see the same timeline: pending reviews, retakes granted (by either
            role), approvals, and rejections. Actions you take here are visible to the other role
            instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          { label: "Pending review", value: stats.pending, icon: Clock, tone: "text-amber-300" },
          {
            label: "Retake open",
            value: stats.retakeAwaiting ?? retakeAwaiting.length,
            icon: RotateCcw,
            tone: "text-violet-300",
          },
          { label: "Approved", value: stats.approved, icon: Trophy, tone: "text-emerald-300" },
          { label: "Rejected", value: stats.rejected, icon: X, tone: "text-rose-300" },
          { label: "All events", value: stats.total ?? history.length, icon: History, tone: "text-blue-300" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <div className="rounded-lg bg-slate-800 p-2.5">
              <stat.icon className={`h-5 w-5 ${stat.tone}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-white">Action needed</h2>
          <p className="text-xs text-slate-500">
            Pending reviews and rejected final quiz certificates — approve, reject, or allow a
            retake.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-white">No pending reviews</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
              New submissions and rejected certificates appear here. Allow a retake after rejection
              so the trainee can try again.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{item.user.name}</p>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        item.kind === "final_quiz"
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-violet-500/20 text-violet-200"
                      }`}
                    >
                      {item.kind === "final_quiz" ? "Final Quiz" : "Project"}
                    </span>
                    {item.status === "REJECTED" && (
                      <span className="inline-flex rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-200">
                        Rejected
                      </span>
                    )}
                    {item.status === "PENDING_REVIEW" && (
                      <span className="inline-flex rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                        Pending review
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{item.user.email}</p>
                  <p className="text-sm text-slate-300">
                    {item.kind === "final_quiz"
                      ? `${item.quizTitle || "Final Quiz"}${item.cycle != null ? ` · cycle ${item.cycle}` : ""}`
                      : `${item.project?.name}${item.project?.categoryRel?.name ? ` · ${item.project.categoryRel.name}` : ""}`}
                  </p>
                  <p className="text-sm text-emerald-300">
                    Score {Math.round(item.score)}% · {formatDisplayDateTime(item.submittedAt)}
                  </p>
                  {item.reviewNote && (
                    <p className="mt-1 rounded-md bg-rose-500/10 px-2 py-1.5 text-xs text-rose-100">
                      Reason: {item.reviewNote}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.kind === "final_quiz" && item.canAllowRetake && (
                    <button
                      type="button"
                      disabled={actingId !== null}
                      onClick={() => allowRetake(item.user.id, item.user.name, item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-700/50 bg-violet-950/40 px-3 py-2 text-sm font-medium text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Allow retake
                    </button>
                  )}
                  {item.status !== "REJECTED" && (
                    <>
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => review(item.id, "APPROVE", item.kind)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => review(item.id, "REJECT", item.kind)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {item.status === "REJECTED" && (
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => review(item.id, "APPROVE", item.kind, { reversing: true, traineeName: item.user.name })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve instead
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {retakeAwaiting.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-violet-800/40 bg-violet-950/20">
          <div className="border-b border-violet-800/40 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-white">Retake open — awaiting trainee</h2>
          </div>
          <ul className="divide-y divide-violet-900/40">
            {retakeAwaiting.map((row) => (
              <li key={row.traineeId} className="px-4 py-4 sm:px-5">
                <p className="font-medium text-white">{row.traineeName}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Previous {row.previousScore != null ? `${row.previousScore}%` : "—"} · cycle{" "}
                  {row.evaluationCycle}
                </p>
                <p className="mt-1 text-xs text-violet-200/90">
                  {formatCertActionBy("retake_open", row.grantedBy) ??
                    "Retake allowed by Admin or Team Lead"}{" "}
                  · {formatDisplayDateTime(row.grantedAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Full history</h2>
            <p className="text-xs text-slate-500">
              Timeline of all certificate events. Use actions below to fix mistaken approve/reject
              decisions on the current cycle.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
                ["retakes", "Retakes"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHistoryFilter(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  historyFilter === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-slate-400">Loading history…</div>
        ) : filteredHistory.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No history yet.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {filteredHistory.map((row) => (
              <li key={row.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{row.trainee.name}</p>
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {kindLabel(row.kind)}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${eventTone(row.event)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {row.title}
                      {row.subtitle ? (
                        <span className="text-slate-500"> · {row.subtitle}</span>
                      ) : null}
                      {row.cycle != null ? (
                        <span className="text-slate-500">{` · cycle ${row.cycle}`}</span>
                      ) : null}
                    </p>
                    {row.score != null && (
                      <p className="text-sm tabular-nums text-slate-400">Score {row.score}%</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {formatDisplayDateTime(row.at)}
                      {row.event === "pending" && !row.actor
                        ? " · awaiting review (use Action needed above)"
                        : null}
                    </p>
                    {(() => {
                      const label = formatCertActionByOrUnknown(
                        historyActorEvent(row),
                        row.actor
                      );
                      if (!label) return null;
                      return (
                        <p
                          className={`mt-1 inline-block rounded-md px-2 py-1 text-xs ${
                            row.actor ? actorTone(row.event) : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {label}
                        </p>
                      );
                    })()}
                    {row.reviewNote && (
                      <p className="mt-1 rounded-md bg-rose-500/10 px-2 py-1.5 text-xs text-rose-100">
                        Reason: {row.reviewNote}
                      </p>
                    )}
                  </div>
                  {(row.canApprove || row.canReject || row.canAllowRetake) &&
                    row.certId &&
                    row.kind !== "retake_grant" && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {row.canAllowRetake && row.kind === "final_quiz" && (
                        <button
                          type="button"
                          disabled={actingId !== null}
                          onClick={() =>
                            allowRetake(row.trainee.id, row.trainee.name, row.certId!)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-700/50 bg-violet-950/40 px-3 py-2 text-sm font-medium text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Allow retake
                        </button>
                      )}
                      {row.canApprove && row.event !== "pending" && (
                        <button
                          type="button"
                          disabled={actingId !== null}
                          onClick={() =>
                            review(row.certId!, "APPROVE", row.kind as "project" | "final_quiz", {
                              reversing: true,
                              traineeName: row.trainee.name,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                      )}
                      {row.canReject && row.event !== "pending" && (
                        <button
                          type="button"
                          disabled={actingId !== null}
                          onClick={() =>
                            review(row.certId!, "REJECT", row.kind as "project" | "final_quiz", {
                              reversing: true,
                              traineeName: row.trainee.name,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
