"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Lock,
  Shield,
} from "lucide-react";
import { formatDisplayDate } from "@/lib/format-date";
import { formatCertActionBy } from "@/lib/cert-reviewer";
import { getEvaluationBand } from "@/lib/evaluation";

type BandTone = "red" | "amber" | "blue" | "emerald" | "muted";

/** Tailwind classes live here so they are always included in the CSS bundle. */
const BAND_RESULT: Record<
  BandTone,
  {
    card: string;
    headerLabel: string;
    circle: string;
    badge: string;
    description: string;
  }
> = {
  red: {
    card: "border-red-200 bg-gradient-to-b from-red-50 to-white shadow-xl dark:border-red-500/30 dark:from-red-950/40 dark:to-slate-950 dark:shadow-red-950/20",
    headerLabel: "text-red-700 dark:text-red-300/90",
    circle:
      "bg-red-100 text-red-700 ring-4 ring-red-200 dark:bg-red-500/25 dark:text-red-300 dark:ring-red-500/35",
    badge:
      "border-red-400 bg-red-100 text-red-800 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300",
    description: "text-red-800 dark:text-red-300/90",
  },
  amber: {
    card: "border-orange-200 bg-gradient-to-b from-orange-50 to-white shadow-xl dark:border-orange-500/30 dark:from-orange-950/40 dark:to-slate-950 dark:shadow-orange-950/20",
    headerLabel: "text-orange-700 dark:text-orange-300/90",
    circle:
      "bg-orange-100 text-orange-700 ring-4 ring-orange-200 dark:bg-orange-500/25 dark:text-orange-300 dark:ring-orange-500/35",
    badge:
      "border-orange-400 bg-orange-100 text-orange-900 dark:border-orange-500/50 dark:bg-orange-500/20 dark:text-orange-300",
    description: "text-orange-800 dark:text-orange-300/90",
  },
  blue: {
    card: "border-blue-200 bg-gradient-to-b from-blue-50 to-white shadow-xl dark:border-blue-500/30 dark:from-blue-950/40 dark:to-slate-950 dark:shadow-blue-950/20",
    headerLabel: "text-blue-700 dark:text-blue-300/90",
    circle:
      "bg-blue-100 text-blue-700 ring-4 ring-blue-200 dark:bg-blue-500/25 dark:text-blue-300 dark:ring-blue-500/35",
    badge:
      "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-500/50 dark:bg-blue-500/20 dark:text-blue-300",
    description: "text-blue-800 dark:text-blue-300/90",
  },
  emerald: {
    card: "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-xl dark:border-emerald-500/30 dark:from-emerald-950/40 dark:to-slate-950 dark:shadow-emerald-950/20",
    headerLabel: "text-emerald-700 dark:text-emerald-300/90",
    circle:
      "bg-emerald-100 text-emerald-700 ring-4 ring-emerald-200 dark:bg-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-500/35",
    badge:
      "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300",
    description: "text-emerald-800 dark:text-emerald-300/90",
  },
  muted: {
    card: "border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-950",
    headerLabel: "text-slate-600 dark:text-slate-400",
    circle:
      "bg-slate-100 text-slate-700 ring-4 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    badge:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400",
    description: "text-slate-600 dark:text-slate-400",
  },
};

function bandResultStyles(tone: BandTone) {
  return BAND_RESULT[tone] ?? BAND_RESULT.muted;
}

type PreviousAttempt = {
  cycle: number;
  score: number;
  createdAt: string;
};

type Question = {
  id: string;
  question: string;
  options: string;
  sortOrder: number;
};

export type FinalExamState = {
  scheduleComplete: boolean;
  unlocked: boolean;
  canSubmit: boolean;
  attempted: boolean;
  retakeGranted?: boolean;
  certificateStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  certificateReviewNote?: string | null;
  certificateReviewedBy?: { id: string; name: string; role: string } | null;
  cycle?: number;
  previousAttempts?: PreviousAttempt[];
  message?: string;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    questionCount: number;
    questions?: Question[];
  } | null;
  attempt: {
    score: number;
    passed: boolean;
    createdAt: string;
    cycle?: number;
  } | null;
  band: {
    band: string;
    label: string;
    tone: "red" | "amber" | "blue" | "emerald" | "muted";
    description: string;
  };
};

function PreviousAttemptsList({
  attempts,
  title = "Previous attempts",
}: {
  attempts: PreviousAttempt[];
  title?: string;
}) {
  if (!attempts.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {attempts.map((a) => {
          const band = getEvaluationBand(a.score);
          const styles = bandResultStyles(band.tone);
          return (
            <li
              key={a.cycle}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="text-slate-600 dark:text-slate-400">
                Cycle {a.cycle} · {formatDisplayDate(a.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <span className={`font-semibold tabular-nums ${styles.description}`}>
                  {a.score}%
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
                >
                  {band.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Compact CTA for Today's Work — links to the full exam page. */
export function FinalExamGateCard() {
  const [state, setState] = useState<FinalExamState | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/final-evaluation");
      const data = await res.json();
      if (res.ok) setState(data);
    })();
  }, []);

  if (!state) return null;

  if (!state.scheduleComplete && !state.attempted) {
    return null;
  }

  if (state.attempted && state.attempt) {
    const pendingReview = state.certificateStatus === "PENDING_REVIEW";
    const certRejected = state.certificateStatus === "REJECTED";
    return (
      <Link
        href="/trainee/final-quiz"
        className={`block rounded-2xl border px-5 py-4 transition ${
          certRejected
            ? "border-rose-200 bg-rose-50 hover:border-rose-300 dark:border-rose-700/40 dark:bg-rose-950/25 dark:hover:border-rose-500/60"
            : "border-violet-200 bg-violet-50 hover:border-violet-300 dark:border-violet-700/40 dark:bg-violet-950/25 dark:hover:border-violet-500/60"
        }`}
      >
        <p
          className={`flex items-center gap-2 text-sm font-semibold ${
            certRejected
              ? "text-rose-800 dark:text-rose-100"
              : "text-violet-800 dark:text-violet-100"
          }`}
        >
          <Award className="h-4 w-4" />
          Final quiz submitted — {state.attempt.score}%
          {pendingReview && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              Pending review
            </span>
          )}
          {certRejected && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
              Not approved
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {pendingReview
            ? "Waiting for Admin or Team Lead approval. Your certificate will show after approval."
            : certRejected
              ? "Certificate was not approved. See Certificates for details."
              : "View your result. Admin reviews this along with your overall training work."}
        </p>
        {certRejected && state.certificateReviewNote && (
          <p className="mt-2 rounded-md bg-rose-100 px-2 py-1.5 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            Reason: {state.certificateReviewNote}
          </p>
        )}
        {state.certificateReviewedBy &&
          formatCertActionBy(
            certRejected ? "rejected" : "approved",
            state.certificateReviewedBy
          ) && (
            <p className="mt-2 text-[10px] text-slate-500">
              {formatCertActionBy(
                certRejected ? "rejected" : "approved",
                state.certificateReviewedBy
              )}
            </p>
          )}
        {(state.previousAttempts?.length ?? 0) > 0 && (
          <p className="mt-2 text-[10px] text-slate-500">
            {state.previousAttempts!.length} earlier attempt
            {state.previousAttempts!.length !== 1 ? "s" : ""} on record
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/trainee/final-quiz"
      className="block overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 shadow-lg shadow-amber-100/60 transition hover:border-amber-300 dark:border-amber-500/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 dark:shadow-amber-950/20 dark:hover:border-amber-400/60"
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300/90">
          Final Quiz
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Final Quiz Ready</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
          Training days are done. Take the final quiz. You get one try. Your score is one part of
          the review — your day work still matters too.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300">
          <ClipboardCheck className="h-4 w-4" />
          Open Final Quiz
        </span>
      </div>
    </Link>
  );
}

/** Full-page entrance-style exam experience. */
export function FinalEvaluationExam() {
  const [state, setState] = useState<FinalExamState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/final-evaluation");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load final quiz");
      return;
    }
    setError("");
    setState(data);
    setStarted(false);
    setStep(0);
    setAnswers({});
  }

  useEffect(() => {
    void load();
  }, []);

  const questions = state?.quiz?.questions ?? [];
  const current = questions[step];
  const options = useMemo(
    () => (current ? parseOptions(current.options) : []),
    [current]
  );
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const allAnswered =
    questions.length > 0 && questions.every((q) => Boolean(answers[q.id]));
  const progressPct =
    questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;

  async function submit() {
    if (!allAnswered || submitting) return;
    if (!state) return;
    if (
      !confirm(
        "Submit your final quiz?\n\nYou only get one attempt. This score is submitted for review."
      )
    ) {
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/final-evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Submit failed");
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        Preparing final quiz…
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-amber-700 dark:text-amber-300">
        {error}
      </div>
    );
  }

  if (!state) return null;

  if (!state.scheduleComplete && !state.attempted) {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60">
        <div className="border-b border-slate-200 px-8 py-10 text-center dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Final quiz locked</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Finish every day on your training schedule first (including any extra week). Then this
            page opens as your entrance evaluation — one attempt only.
          </p>
          <Link
            href="/trainee/training"
            className="mt-6 inline-block text-sm text-blue-700 hover:underline dark:text-blue-400"
          >
            Back to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  if (state.attempted && state.attempt) {
    const styles = bandResultStyles(state.band.tone);
    const pendingReview = state.certificateStatus === "PENDING_REVIEW";
    const certApproved = state.certificateStatus === "APPROVED";
    const certRejected = state.certificateStatus === "REJECTED";
    return (
      <div className={`mx-auto max-w-xl overflow-hidden rounded-3xl border ${styles.card}`}>
        <div className="border-b border-inherit px-8 py-6 text-center opacity-90">
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${styles.headerLabel}`}>
            Final quiz
            {state.cycle != null && state.cycle > 1 ? ` · cycle ${state.cycle}` : ""}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {pendingReview
              ? "Pending review"
              : certRejected
                ? "Certificate not approved"
                : "Result submitted"}
          </h1>
        </div>
        <div className="flex flex-col items-center px-8 py-10 text-center">
          {pendingReview && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200">
              Waiting for Approval
            </span>
          )}
          {certRejected && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-200">
              Certificate not approved
            </span>
          )}
          <div
            className={`mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold tabular-nums ${styles.circle}`}
          >
            {state.attempt.score}%
          </div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
          >
            {state.band.label}
          </span>
          <p className={`mt-4 max-w-sm text-sm ${styles.description}`}>
            {state.band.description}
          </p>
          {certRejected && state.certificateReviewNote && (
            <p className="mt-4 w-full max-w-sm rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100">
              <span className="font-medium">Reason: </span>
              {state.certificateReviewNote}
            </p>
          )}
          {state.certificateReviewedBy &&
            formatCertActionBy(
              certRejected ? "rejected" : certApproved ? "approved" : "pending",
              state.certificateReviewedBy
            ) &&
            (certRejected || certApproved) && (
              <p className="mt-3 text-xs text-slate-500">
                {formatCertActionBy(
                  certRejected ? "rejected" : "approved",
                  state.certificateReviewedBy
                )}
              </p>
            )}
          {(state.previousAttempts?.length ?? 0) > 0 && (
            <div className="mt-6 w-full max-w-sm">
              <PreviousAttemptsList attempts={state.previousAttempts!} />
            </div>
          )}
          <p className="mt-6 text-xs text-slate-500">
            {pendingReview ? (
              <>
                Your certificate will appear on{" "}
                <Link
                  href="/certifications"
                  className="text-blue-700 underline hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Certificates
                </Link>{" "}
                after Admin or Team Lead approves it.
              </>
            ) : certRejected ? (
              <>
                See{" "}
                <Link
                  href="/certifications"
                  className="text-blue-700 underline hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Certificates
                </Link>{" "}
                for details. Final quiz retakes are not available.
              </>
            ) : certApproved ? (
              <>
                Your certificate is on{" "}
                <Link
                  href="/certifications"
                  className="text-blue-700 underline hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Certificates
                </Link>
                . Admin and Team Lead review this score with your overall training performance.
              </>
            ) : (
              "Admin and Team Lead review this score with your overall training performance."
            )}
          </p>
          <Link
            href="/trainee/training"
            className="mt-8 text-sm text-slate-500 hover:text-slate-700 hover:underline dark:hover:text-slate-200"
          >
            Return to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  if (!state.canSubmit || !state.quiz) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        {state.message || "Final quiz is not available."}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 shadow-xl dark:border-amber-500/25 dark:from-slate-950 dark:via-[#1a1520] dark:to-slate-950 dark:shadow-2xl dark:shadow-black/40">
        <div className="border-b border-amber-100 px-8 py-8 text-center sm:px-10 dark:border-white/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Shield className="h-7 w-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-300/90">
            Final Quiz
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {state.quiz.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {state.message ||
              state.quiz.description ||
              "This final quiz comes after training. You get one try. Admin also looks at your day work."}
          </p>
        </div>
        <div className="px-8 py-8 sm:px-10">
          {(state.previousAttempts?.length ?? 0) > 0 && (
            <div className="mb-6">
              <PreviousAttemptsList attempts={state.previousAttempts!} />
            </div>
          )}
          <ul className="mb-8 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-600 dark:text-amber-400">•</span>
              <span>
                {state.quiz.questionCount} question
                {state.quiz.questionCount !== 1 ? "s" : ""} · one at a time
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-600 dark:text-amber-400">•</span>
              <span>You may go back to change answers before submit</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-600 dark:text-amber-400">•</span>
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  One attempt only
                </strong>{" "}
                — your score is submitted for Admin and Team Lead review
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-600 dark:text-amber-400">•</span>
              <span>Find a quiet moment; treat this like a real quiz</span>
            </li>
          </ul>
          {error && <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">{error}</p>}
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300"
          >
            Begin final quiz
          </button>
          <Link
            href="/trainee/training"
            className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Not ready — back to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/30">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-8 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400/80">
              Final quiz
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Question {step + 1} of {questions.length}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 w-2 rounded-full ${
                i === step
                  ? "bg-amber-500 dark:bg-amber-400"
                  : answers[q.id]
                    ? "bg-emerald-500/70"
                    : "bg-slate-300 dark:bg-slate-700"
              }`}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 sm:px-8">
          {error}
        </p>
      )}

      {current && (
        <div className="px-5 py-8 sm:px-8">
          <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-white">{current.question}</p>
          <ul className="mt-6 space-y-3">
            {options.map((opt) => {
              const selected = answers[current.id] === opt;
              return (
                <li key={opt}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm transition ${
                      selected
                        ? "border-amber-400 bg-amber-50 text-slate-900 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={current.id}
                      className="mt-1"
                      checked={selected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [current.id]: opt }))
                      }
                    />
                    <span>{opt}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            {step < questions.length - 1 ? (
              <button
                type="button"
                disabled={!answers[current.id]}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!allAnswered || submitting}
                onClick={() => void submit()}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit quiz"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
