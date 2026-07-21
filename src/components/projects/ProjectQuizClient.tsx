"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type CertificationQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export function ProjectQuizClient({
  questions,
  projectId,
  projectName,
}: {
  questions: CertificationQuestion[];
  projectId: string;
  projectName: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const score = useMemo(
    () =>
      questions.reduce(
        (total, question, index) =>
          total + (answers[index] === question.correctIndex ? 1 : 0),
        0
      ),
    [answers, questions]
  );
  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passed = scorePercent >= 80;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSaveError(null);
    // Always show results so the employee sees their score
    setSubmitted(true);

    try {
      const response = await fetch("/api/quiz/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          score,
          passed,
          answers,
          totalQuestions: questions.length,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveError(data.error || "Could not save your attempt. Your score is shown below.");
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      setSaveError("Could not save your attempt. Your score is shown below.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <Award className={cn("h-10 w-10", passed ? "text-emerald-300" : "text-amber-300")} />
          <h2 className="mt-4 text-2xl font-bold text-white">
            {passed ? "Quiz passed — pending approval" : "Retake recommended"}
          </h2>
          <p className="mt-3 text-3xl font-bold text-white">
            {scorePercent}%
            <span className="ml-2 text-lg font-normal text-slate-400">
              ({score} / {questions.length} correct)
            </span>
          </p>
          <p className="mt-2 text-slate-400">
            {passed
              ? `You scored 80%+. Your ${projectName} certificate is waiting for Admin or Team Lead approval.`
              : "You need 80% or higher. Review the answers below and try again."}
          </p>
          {saveError && <p className="mt-3 text-sm text-amber-300">{saveError}</p>}
          {submitting && <p className="mt-2 text-sm text-slate-500">Saving your result…</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            {passed && (
              <Link
                href="/certifications"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                View Certifications
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setSaveError(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </button>
          </div>
        </div>

        {questions.map((question, index) => (
          <div key={question.question} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">
              Q{index + 1}. {question.question}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Your answer:{" "}
              {answers[index] != null
                ? question.options[answers[index]]
                : "—"}
            </p>
            <p className="mt-1 text-sm text-emerald-400/90">
              Correct answer: {question.options[question.correctIndex]}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {questions.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              answers[index] == null ? "bg-slate-700" : "bg-blue-400"
            )}
          />
        ))}
      </div>

      {questions.map((question, index) => (
        <div key={question.question} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-medium text-blue-300">
            Question {index + 1} of {questions.length}
          </p>
          <h2 className="mt-2 font-semibold text-white">
            Q{index + 1}. {question.question}
          </h2>
          <div className="mt-4 grid gap-3">
            {question.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm transition",
                  answers[index] === optionIndex
                    ? "border-blue-500 bg-blue-600/20 text-white"
                    : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500"
                )}
              >
                {String.fromCharCode(65 + optionIndex)}. {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={!allAnswered || submitting}
        onClick={handleSubmit}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Submitting…"
          : allAnswered
            ? "Submit All Answers"
            : `Answer ${questions.length - answeredCount} more to submit`}
      </button>
    </div>
  );
}
