"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Save } from "lucide-react";

type CompletedDay = {
  dayNumber: number;
  title: string;
  projectName: string | null;
  dayType: string;
  percent: number;
  checklist: { title: string; completed: boolean }[];
  workItems: { title: string; completed: boolean }[];
  lessons: { title: string; completed: boolean; courseTitle: string }[];
  review: { notes: string | null; rating: number | null } | null;
};

type Row = {
  trainee: { id: string; name: string; email: string };
  currentDay: number;
  overallPercent: number;
  todayTitle: string | null;
  todayDone: boolean;
  todayPercent: number;
  completedDays: CompletedDay[];
};

export default function DayReviewsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/trainer/day-reviews");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to load");
      return;
    }
    setRows(data.rows || []);
    const n: Record<string, string> = {};
    const r: Record<string, string> = {};
    for (const row of data.rows || []) {
      for (const d of row.completedDays || []) {
        const key = `${row.trainee.id}:${d.dayNumber}`;
        n[key] = d.review?.notes || "";
        r[key] = d.review?.rating != null ? String(d.review.rating) : "";
      }
    }
    setNotes(n);
    setRatings(r);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveReview(traineeId: string, dayNumber: number) {
    const key = `${traineeId}:${dayNumber}`;
    setMsg("");
    const res = await fetch("/api/trainer/day-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traineeId,
        dayNumber,
        notes: notes[key] || null,
        rating: ratings[key] ? Number(ratings[key]) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Save failed");
      return;
    }
    setMsg("Review saved (optional feedback for this day).");
    await load();
  }

  if (loading) {
    return <p className="text-slate-400">Loading day work…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Day reviews</h1>
        <p className="mt-2 text-sm text-slate-400">
          See what each trainee completed on their day-wise plan. Leaving a review is optional.
        </p>
        <Link href="/admin/progress" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
          Full team progress →
        </Link>
      </div>

      {msg && (
        <p className="rounded-xl bg-blue-500/10 px-4 py-2 text-sm text-blue-200">{msg}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-slate-500">No trainees on your team yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.trainee.id}
              className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{row.trainee.name}</p>
                  <p className="text-xs text-slate-500">{row.trainee.email}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Day {row.currentDay} · Overall {row.overallPercent}%
                    {row.todayTitle
                      ? ` · Today: ${row.todayTitle} (${row.todayPercent}%)`
                      : ""}
                  </p>
                </div>
              </div>

              {row.completedDays.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No completed days yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {row.completedDays.map((d) => {
                    const key = `${row.trainee.id}:${d.dayNumber}`;
                    const open = openKey === key;
                    return (
                      <li
                        key={key}
                        className="rounded-xl border border-slate-800 bg-slate-950/40"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenKey(open ? null : key)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Day {d.dayNumber}: {d.title}
                            {d.projectName ? ` · ${d.projectName}` : ""}
                            {d.review && (
                              <span className="text-xs text-blue-300">· reviewed</span>
                            )}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        {open && (
                          <div className="space-y-3 border-t border-slate-800 px-4 py-3">
                            <ul className="space-y-1 text-sm text-slate-300">
                              {d.checklist.map((c) => (
                                <li key={`c-${c.title}`}>
                                  {c.completed ? "✓" : "○"}{" "}
                                  <span className="text-slate-500">Checklist · </span>
                                  {c.title}
                                </li>
                              ))}
                              {d.lessons.map((l) => (
                                <li key={`l-${l.title}`}>
                                  {l.completed ? "✓" : "○"}{" "}
                                  <span className="text-slate-500">Course · </span>
                                  {l.title}
                                  <span className="text-xs text-slate-500">
                                    {" "}
                                    · {l.courseTitle}
                                  </span>
                                </li>
                              ))}
                              {(d.workItems || []).map((c) => (
                                <li key={`w-${c.title}`}>
                                  {c.completed ? "✓" : "○"}{" "}
                                  <span className="text-slate-500">Work · </span>
                                  {c.title}
                                </li>
                              ))}
                            </ul>
                            <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                              <textarea
                                value={notes[key] || ""}
                                onChange={(e) =>
                                  setNotes((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                placeholder="Optional notes for this day…"
                                rows={2}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                              />
                              <select
                                value={ratings[key] || ""}
                                onChange={(e) =>
                                  setRatings((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                              >
                                <option value="">Rating</option>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {n}/5
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => saveReview(row.trainee.id, d.dayNumber)}
                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500"
                              >
                                <Save className="h-4 w-4" />
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
