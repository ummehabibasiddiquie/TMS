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
import { bandBadgeClass } from "@/lib/evaluation";

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
  } | null;
  band: {
    band: string;
    label: string;
    tone: "red" | "amber" | "slate" | "emerald" | "muted";
    description: string;
  };
};

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
    return (
      <Link
        href="/trainee/final-quiz"
        className="block rounded-2xl border border-violet-700/40 bg-violet-950/25 px-5 py-4 transition hover:border-violet-500/60"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-100">
          <Award className="h-4 w-4" />
          Final quiz submitted — {state.attempt.score}%
        </p>
        <p className="mt-1 text-xs text-slate-400">
          View your result. Admin reviews this along with your overall training performance.
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/trainee/final-quiz"
      className="block overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 shadow-lg shadow-amber-950/20 transition hover:border-amber-400/60"
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
          Entrance evaluation
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">Final quiz ready</h3>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Training schedule complete. Take the one-attempt final quiz. Your score is one point of
          evaluation — overall training performance still matters.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950">
          <ClipboardCheck className="h-4 w-4" />
          Open final quiz
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
    if (
      !confirm(
        "Submit your final quiz?\n\nYou cannot retake this quiz for the current cycle."
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
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        Preparing final quiz…
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-amber-300">
        {error}
      </div>
    );
  }

  if (!state) return null;

  if (!state.scheduleComplete && !state.attempted) {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/60">
        <div className="border-b border-slate-800 px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Final quiz locked</h1>
          <p className="mt-3 text-sm text-slate-400">
            Finish every day on your training schedule first (including any extra week). Then this
            page opens as your entrance evaluation — one attempt only.
          </p>
          <Link
            href="/trainee/training"
            className="mt-6 inline-block text-sm text-blue-400 hover:underline"
          >
            Back to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  if (state.attempted && state.attempt) {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-950/50 to-slate-950 shadow-2xl shadow-violet-950/30">
        <div className="border-b border-white/5 px-8 py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">
            Final quiz
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Result submitted</h1>
        </div>
        <div className="flex flex-col items-center px-8 py-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/20 text-3xl font-bold text-violet-100">
            {state.attempt.score}
          </div>
          <p className="text-lg font-semibold text-white">Your score: {state.attempt.score}%</p>
          <span
            className={`mt-3 inline-flex rounded-md border px-3 py-1 text-xs ${bandBadgeClass(state.band.tone)}`}
          >
            {state.band.label}
          </span>
          <p className="mt-4 max-w-sm text-sm text-slate-400">{state.band.description}</p>
          <p className="mt-6 text-xs text-slate-500">
            No retake for this cycle. Your Final Quiz certificate is on{" "}
          <Link href="/certifications" className="text-violet-300 underline hover:text-violet-200">
            Certifications
          </Link>
          . Admin and Team Lead review this score with your overall training performance.
          </p>
          <Link
            href="/trainee/training"
            className="mt-8 text-sm text-slate-400 hover:text-slate-200 hover:underline"
          >
            Return to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  if (!state.canSubmit || !state.quiz) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
        {state.message || "Final quiz is not available."}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-950 via-[#1a1520] to-slate-950 shadow-2xl shadow-black/40">
        <div className="border-b border-white/5 px-8 py-8 text-center sm:px-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            <Shield className="h-7 w-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300/90">
            Entrance evaluation
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {state.quiz.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            {state.quiz.description ||
              "This final quiz is one evaluation point after training — like an entrance test. One attempt. No pass mark. Admin also considers your day-wise work and overall performance."}
          </p>
        </div>
        <div className="px-8 py-8 sm:px-10">
          <ul className="mb-8 space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-400">•</span>
              <span>
                {state.quiz.questionCount} question
                {state.quiz.questionCount !== 1 ? "s" : ""} · one at a time
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-400">•</span>
              <span>You may go back to change answers before submit</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-400">•</span>
              <span>
                <strong className="font-semibold text-white">One attempt only</strong> — no retake
                for this cycle
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 text-amber-400">•</span>
              <span>Find a quiet moment; treat this like a real quiz</span>
            </li>
          </ul>
          {error && <p className="mb-4 text-sm text-amber-300">{error}</p>}
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300"
          >
            Begin final quiz
          </button>
          <Link
            href="/trainee/training"
            className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Not ready — back to Today&apos;s Work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 shadow-2xl shadow-black/30">
      <div className="border-b border-slate-800 px-5 py-4 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
              Final quiz
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Question {step + 1} of {questions.length}
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] tabular-nums text-slate-400">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
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
                  ? "bg-amber-400"
                  : answers[q.id]
                    ? "bg-emerald-500/70"
                    : "bg-slate-700"
              }`}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="border-b border-amber-900/40 bg-amber-950/30 px-5 py-2 text-sm text-amber-200 sm:px-8">
          {error}
        </p>
      )}

      {current && (
        <div className="px-5 py-8 sm:px-8">
          <p className="text-lg font-medium leading-relaxed text-white">{current.question}</p>
          <ul className="mt-6 space-y-3">
            {options.map((opt) => {
              const selected = answers[current.id] === opt;
              return (
                <li key={opt}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm transition ${
                      selected
                        ? "border-amber-500/60 bg-amber-500/10 text-white"
                        : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500"
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
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40"
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
