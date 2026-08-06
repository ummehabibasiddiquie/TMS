"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  question: string;
  options: string;
  correct: string;
};

type Quiz = {
  id: string;
  title: string;
  passingScore: number;
  questions: Question[];
};

type Props = {
  quiz: Quiz;
  indexLabel: string;
  passed: boolean;
  result: { score: number; passed: boolean } | null;
  submitting?: boolean;
  onSubmit: (quizId: string, answers: Record<string, string>) => Promise<void> | void;
  onRetake: () => void;
};

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function LessonQuizExam({
  quiz,
  indexLabel,
  passed,
  result,
  submitting,
  onSubmit,
  onRetake,
}: Props) {
  const questions = quiz.questions;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setStep(0);
    setAnswers({});
    setStarted(false);
  }, [quiz.id]);

  const current = questions[step];
  const options = useMemo(
    () => (current ? parseOptions(current.options) : []),
    [current]
  );
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const progressPct =
    questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;
  const currentAnswered = current ? Boolean(answers[current.id]) : false;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const isLast = step >= questions.length - 1;
  const showResult = Boolean(result) || passed;
  const didPass = Boolean(result?.passed || passed);

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    await onSubmit(quiz.id, answers);
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
        This quiz has no questions yet.
      </div>
    );
  }

  if (showResult) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border",
          didPass
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-gradient-to-br dark:from-emerald-950/50 dark:to-slate-900/80"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-gradient-to-br dark:from-red-950/40 dark:to-slate-900/80"
        )}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {indexLabel}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {quiz.title}
          </h3>
        </div>
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div
            className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              didPass
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/20 text-red-700 dark:text-red-300"
            )}
          >
            {didPass ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <span className="text-2xl font-bold">{Math.round(result?.score ?? 0)}</span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {didPass ? "Passed" : "Not passed"}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Score {Math.round(result?.score ?? 0)}% · Need {quiz.passingScore}% to pass
          </p>
          {!didPass && (
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setAnswers({});
                setStarted(true);
                onRetake();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-cyan-500/20 dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#152038] dark:to-slate-950 dark:shadow-none">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300/80">
            {indexLabel}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            {quiz.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            One question at a time · {questions.length} question
            {questions.length !== 1 ? "s" : ""} · Pass at {quiz.passingScore}%
          </p>
        </div>
        <div className="px-6 py-8">
          <ul className="mb-8 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>• Tap an answer to move to the next question</li>
            <li>• You can go Back to change an answer</li>
            <li>• Last question submits automatically when answered</li>
          </ul>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/20">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {indexLabel} · {quiz.title}
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Question {step + 1} of {questions.length}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-2 w-6 rounded-full transition",
                i === step
                  ? "bg-cyan-500 dark:bg-cyan-400"
                  : answers[q.id]
                    ? "bg-blue-500/70"
                    : "bg-slate-300 dark:bg-slate-700"
              )}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-6 sm:py-8">
        <p className="text-lg font-medium leading-relaxed text-slate-900 sm:text-xl dark:text-white">
          {current.question}
        </p>
        <div className="mt-6 space-y-2.5">
          {options.map((opt, oi) => {
            const selected = answers[current.id] === opt;
            const letter = String.fromCharCode(65 + oi);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setAnswers((prev) => {
                    const nextAnswers = { ...prev, [current.id]: opt };
                    const allDone = questions.every((q) => Boolean(nextAnswers[q.id]));
                    window.setTimeout(() => {
                      if (step < questions.length - 1) {
                        setStep((s) => Math.min(questions.length - 1, s + 1));
                      } else if (allDone && !submitting) {
                        void onSubmit(quiz.id, nextAnswers);
                      }
                    }, 280);
                    return nextAnswers;
                  });
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition",
                  selected
                    ? "border-cyan-500 bg-cyan-50 text-slate-900 shadow-sm dark:border-cyan-400/60 dark:bg-cyan-500/10 dark:text-white dark:shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/70"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    selected
                      ? "bg-cyan-600 text-white dark:bg-cyan-400 dark:text-slate-950"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  )}
                >
                  {letter}
                </span>
                <span className="pt-0.5 text-sm leading-relaxed sm:text-[15px]">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {!isLast ? (
          <button
            type="button"
            disabled={!currentAnswered}
            onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void handleSubmit()}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        )}
      </div>
    </div>
  );
}
