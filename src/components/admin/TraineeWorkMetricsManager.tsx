"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";
import { TraineeWorkMetricsForm } from "@/components/admin/TraineeWorkMetricsForm";

type PracticeProject = { id: string; name: string; dayNumber?: number };

type WorkByProject = {
  projectId: string;
  projectName: string;
  dayNumber?: number;
  hoursLogged: number | null;
  productionUnits: number | null;
  qualityScore: number | null;
};

type DayRow = {
  dayNumber: number;
  title: string;
  projectName?: string | null;
  hrmsProjectId?: string | null;
  hasTrainingWork?: boolean;
  due?: { dueDate?: string | null } | null;
  productionTarget?: number | null;
  assignedHours?: number | null;
};

type TraineeRow = {
  id: string;
  name: string;
  email: string;
  currentDay: number;
  totalDays: number;
  overallPercent?: number;
  learningPercent?: number;
  trainingStart?: string | null;
  practiceProjects?: PracticeProject[];
  workByProject?: WorkByProject[];
  days?: DayRow[];
};

function hasSubmittedMetrics(w?: {
  hoursLogged: number | null;
  productionUnits: number | null;
  qualityScore: number | null;
}) {
  if (!w) return false;
  return (
    w.hoursLogged != null ||
    w.productionUnits != null ||
    w.qualityScore != null
  );
}

function pendingCount(r: TraineeRow) {
  const through = Math.max(1, r.currentDay || 1);
  const submittedDays = new Set(
    (r.workByProject || [])
      .filter((w) => hasSubmittedMetrics(w) && w.dayNumber != null)
      .map((w) => w.dayNumber as number)
  );

  const workDays = new Set<number>();
  for (const d of r.days || []) {
    if (d.dayNumber > through) continue;
    if (
      d.hasTrainingWork ||
      d.hrmsProjectId?.trim() ||
      d.projectName?.trim()
    ) {
      workDays.add(d.dayNumber);
    }
  }
  for (const p of r.practiceProjects || []) {
    if (p.dayNumber != null && p.dayNumber <= through) {
      workDays.add(p.dayNumber);
    }
  }

  let pending = 0;
  for (const day of workDays) {
    if (!submittedDays.has(day)) pending += 1;
  }
  return pending;
}

export function TraineeWorkMetricsManager({
  initialTraineeId,
}: {
  initialTraineeId?: string | null;
}) {
  const [rows, setRows] = useState<TraineeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTraineeId || null
  );

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setLoading(true);
      try {
        const res = await fetch("/api/curriculum/progress");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load trainees");
          return;
        }
        const list = (data.trainees || []) as TraineeRow[];
        setRows(list);
        setError("");
        setSelectedId((prev) => {
          if (prev && list.some((t) => t.id === prev)) return prev;
          if (initialTraineeId && list.some((t) => t.id === initialTraineeId)) {
            return initialTraineeId;
          }
          return list[0]?.id ?? null;
        });
      } catch {
        setError("Failed to load trainees");
      } finally {
        if (!opts?.quiet) setLoading(false);
      }
    },
    [initialTraineeId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );

  const totalPending = useMemo(
    () => rows.reduce((n, r) => n + pendingCount(r), 0),
    [rows]
  );

  if (loading && rows.length === 0) {
    return <SectionLoader message="Loading…" />;
  }

  if (error && rows.length === 0) {
    return <p className="text-sm text-amber-200">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
        <span>
          {totalPending > 0
            ? `${totalPending} pending across team`
            : "All caught up"}
        </span>
        <Link
          href="/admin/progress"
          className="font-medium text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          Progress
        </Link>
      </div>

      {busy && <WorkingBanner message="Saving…" />}
      {msg && !busy && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300/90">{msg}</p>
      )}
      {error && <p className="text-sm text-amber-700 dark:text-amber-200">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="max-h-[min(75vh,720px)] overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((r) => {
              const pending = pendingCount(r);
              const active = r.id === selectedId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      setMsg("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                      active
                        ? "bg-blue-50 text-slate-900 dark:bg-blue-600/25 dark:text-white"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {r.name}
                    </span>
                    <span
                      className={`shrink-0 text-sm tabular-nums ${
                        pending > 0
                          ? "font-semibold text-amber-600 dark:text-amber-300"
                          : "text-emerald-600 dark:text-slate-500"
                      }`}
                    >
                      {pending > 0 ? pending : "✓"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none sm:p-6">
          {!selected ? (
            <p className="text-base text-slate-500">Select a trainee.</p>
          ) : (
            <TraineeWorkMetricsForm
              compact
              traineeId={selected.id}
              traineeName={selected.name}
              currentDay={Math.max(selected.currentDay, 1)}
              trainingStart={selected.trainingStart ?? null}
              dayOptions={(selected.days || []).map((d) => ({
                dayNumber: d.dayNumber,
                title: d.title,
                projectName: d.projectName,
                hrmsProjectId: d.hrmsProjectId,
                hasTrainingWork: d.hasTrainingWork,
                dueDate: d.due?.dueDate ?? null,
                productionTarget: d.productionTarget ?? null,
                assignedHours: d.assignedHours ?? null,
              }))}
              practiceProjects={(selected.practiceProjects || []).filter(
                (p) =>
                  p.dayNumber == null ||
                  p.dayNumber <= Math.max(selected.currentDay, 1)
              )}
              existing={(selected.workByProject || []).map((w) => ({
                dayNumber: w.dayNumber ?? 0,
                projectName: w.projectName,
                hoursLogged: w.hoursLogged,
                productionUnits: w.productionUnits,
                qualityScore: w.qualityScore,
              }))}
              onSaved={async () => {
                setBusy(true);
                await load({ quiet: true });
                setBusy(false);
                setMsg(`Saved · ${selected.name}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
