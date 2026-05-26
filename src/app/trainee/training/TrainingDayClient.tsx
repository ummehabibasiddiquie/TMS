"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  CheckCircle,
  AlertTriangle,
  Send,
  BookOpen,
  Clock,
} from "lucide-react";

type Phase = {
  id: string;
  phase: string;
  productivityTarget: number;
  qualityTarget: number;
  qcDeadline: string;
};

type RequiredLearn = {
  id: string;
  label: string;
  lessonId: string | null;
  courseId: string | null;
  lesson?: { id: string; title: string; module: { courseId: string } } | null;
  course?: { id: string; title: string } | null;
};

type Props = {
  currentDay: number;
  day: {
    id: number;
    title: string;
    projectName: string;
    phases: Phase[];
    requiredLearn: RequiredLearn[];
  } | null;
  allDays: { id: number; title: string; projectName: string }[];
  learningComplete: boolean;
  progressMap: Record<string, { completed: boolean; watchPercent: number }>;
  submissions: { phase: string; id: string }[];
  profile: { trainingStarted: boolean; currentDayNumber: number } | null;
};

const PHASE_LABELS: Record<string, string> = {
  QUALITY_FOCUS: "Phase 1 — Quality Focus (3 hrs)",
  QUALITY_PRODUCTIVITY: "Phase 2 — Quality + Productivity (3 hrs)",
  PRODUCTION_SIMULATION: "Phase 3 — Production Simulation (3 hrs)",
};

export function TrainingDayClient({
  currentDay,
  day,
  allDays,
  learningComplete,
  progressMap,
  submissions,
  profile,
}: Props) {
  const [activePhase, setActivePhase] = useState(day?.phases[0]?.phase ?? "QUALITY_FOCUS");
  const [form, setForm] = useState({
    sopRead: false,
    tasksCompleted: 0,
    productivityPct: 0,
    qualityPct: 0,
    issues: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitDaily() {
    if (!learningComplete) {
      setMsg("Complete required learning first.");
      return;
    }
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/training/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayNumber: currentDay,
        phase: activePhase,
        ...form,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Submission failed");
      return;
    }
    setMsg("Daily submission recorded successfully.");
  }

  if (!profile?.trainingStarted) {
    return (
      <div className="glass-panel max-w-lg p-8 text-center">
        <h2 className="text-xl font-bold">Training Overview</h2>
        <p className="mt-2 text-slate-400">3 weeks · 15 working days · Project-based</p>
        <p className="mt-4 text-sm">Contact your trainer to start training.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Daily Training</h1>
        <p className="text-slate-400">
          Day {currentDay}: {day?.title} — {day?.projectName}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {allDays.map((d) => (
          <div
            key={d.id}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm ${
              d.id === currentDay
                ? "bg-blue-600 text-white"
                : d.id < currentDay
                  ? "bg-emerald-900/30 text-emerald-300"
                  : "bg-slate-800 text-slate-500"
            }`}
          >
            D{d.id}
          </div>
        ))}
      </div>

      <div className="glass-panel p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-blue-400" />
          Required Learning
          {learningComplete ? (
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              Complete
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              Incomplete
            </span>
          )}
        </h3>
        {!learningComplete && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Complete all items below before Phase work and daily submission.
          </div>
        )}
        <ul className="space-y-3">
          {day?.requiredLearn.map((req) => {
            const lp = req.lessonId ? progressMap[req.lessonId] : null;
            const done = lp?.completed;
            const courseId =
              req.courseId ?? req.lesson?.module?.courseId;
            const href = req.lessonId
              ? `/trainee/courses/${courseId}/player?lesson=${req.lessonId}`
              : req.courseId
                ? `/trainee/courses/${req.courseId}/player`
                : "#";
            return (
              <li
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-slate-500" />
                  )}
                  <span>{req.label}</span>
                </div>
                <Link
                  href={href}
                  className="text-sm text-blue-400 hover:underline"
                >
                  {done ? "Review" : "Start"}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {day?.phases.map((phase) => (
          <div
            key={phase.id}
            className={`glass-panel cursor-pointer p-5 transition ${
              activePhase === phase.phase ? "ring-2 ring-blue-500" : ""
            } ${!learningComplete ? "opacity-60" : ""}`}
            onClick={() => learningComplete && setActivePhase(phase.phase)}
          >
            <h4 className="font-semibold text-sm">
              {PHASE_LABELS[phase.phase] ?? phase.phase}
            </h4>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <p>SOP/PPRT Reading</p>
              <p>Productivity ~{phase.productivityTarget}%</p>
              <p>Quality ~{phase.qualityTarget}%</p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                QC by {phase.qcDeadline}
              </p>
            </div>
            {submissions.some((s) => s.phase === phase.phase) && (
              <span className="mt-3 inline-block text-xs text-emerald-400">
                Submitted
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        className={`glass-panel p-6 ${!learningComplete ? "pointer-events-none opacity-50" : ""}`}
      >
        <h3 className="mb-4 text-lg font-semibold">Daily Performance Submission</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.sopRead}
              onChange={(e) => setForm({ ...form, sopRead: e.target.checked })}
              className="rounded"
            />
            SOP Read
          </label>
          <div>
            <label className="text-sm text-slate-400">Tasks Completed</label>
            <input
              type="number"
              value={form.tasksCompleted}
              onChange={(e) =>
                setForm({ ...form, tasksCompleted: parseInt(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Productivity %</label>
            <input
              type="number"
              value={form.productivityPct}
              onChange={(e) =>
                setForm({ ...form, productivityPct: parseFloat(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Quality %</label>
            <input
              type="number"
              value={form.qualityPct}
              onChange={(e) =>
                setForm({ ...form, qualityPct: parseFloat(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-400">Issues (optional)</label>
            <textarea
              value={form.issues}
              onChange={(e) => setForm({ ...form, issues: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2"
              rows={2}
            />
          </div>
        </div>
        {msg && (
          <p
            className={`mt-4 text-sm ${msg.includes("success") ? "text-emerald-400" : "text-amber-300"}`}
          >
            {msg}
          </p>
        )}
        <button
          onClick={submitDaily}
          disabled={loading || !learningComplete}
          className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "Submitting..." : "Submit Daily Performance"}
        </button>
      </div>
    </div>
  );
}
