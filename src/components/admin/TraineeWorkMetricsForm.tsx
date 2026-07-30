"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { formatDisplayDate } from "@/lib/format-date";
import { dueDateForDay, resolveTrainingStartDate } from "@/lib/day-due";

type Existing = {
  dayNumber: number;
  projectName?: string | null;
  hoursLogged: number | null;
  productionUnits: number | null;
  qualityScore: number | null;
  notes?: string | null;
};

type DayOption = {
  dayNumber: number;
  title: string;
  projectName?: string | null;
  hrmsProjectId?: string | null;
  hasTrainingWork?: boolean;
  dueDate?: string | null;
};

type Draft = {
  hoursLogged: string;
  productionUnits: string;
  qualityScore: string;
};

type PracticeProject = {
  id: string;
  name: string;
  dayNumber?: number;
};

type Props = {
  traineeId: string;
  traineeName: string;
  currentDay: number;
  trainingStart?: string | null;
  dayOptions: DayOption[];
  practiceProjects?: PracticeProject[];
  existing: Existing[];
  disabled?: boolean;
  /** Denser layout for the dedicated Work metrics page */
  compact?: boolean;
  onSaved: () => void | Promise<void>;
};

function formatDayDate(
  day: DayOption,
  trainingStart: Date | null
): string | null {
  if (day.dueDate?.trim()) {
    return formatDisplayDate(day.dueDate, "");
  }
  if (trainingStart) {
    return formatDisplayDate(dueDateForDay(trainingStart, day.dayNumber), "");
  }
  return null;
}

function projectLabel(d: DayOption) {
  const name = d.projectName?.trim();
  if (name) return name;
  const title = (d.title || "").trim();
  if (title && !/^day\s*\d+/i.test(title)) return title;
  return title || `Day ${d.dayNumber}`;
}

function isTrainingWorkDay(d: DayOption) {
  if (d.hasTrainingWork === false) return false;
  if (d.hrmsProjectId?.trim()) return true;
  if (d.hasTrainingWork === true) return true;
  return Boolean(d.projectName?.trim());
}

function hasSubmittedMetrics(row?: Existing | null) {
  if (!row) return false;
  return (
    row.hoursLogged != null ||
    row.productionUnits != null ||
    row.qualityScore != null
  );
}

function toDraft(row?: Existing | null): Draft {
  return {
    hoursLogged: row?.hoursLogged != null ? String(row.hoursLogged) : "0",
    productionUnits:
      row?.productionUnits != null ? String(row.productionUnits) : "0",
    qualityScore: row?.qualityScore != null ? String(row.qualityScore) : "0",
  };
}

function fmt(v: number | null | undefined, suffix = "") {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${v}${suffix}`;
}

function existingKey(existing: Existing[]) {
  return existing
    .map(
      (e) =>
        `${e.dayNumber}:${e.hoursLogged ?? ""}:${e.productionUnits ?? ""}:${e.qualityScore ?? ""}:${e.projectName ?? ""}`
    )
    .join("|");
}

export function TraineeWorkMetricsForm({
  traineeId,
  traineeName,
  currentDay,
  trainingStart,
  dayOptions,
  practiceProjects = [],
  existing,
  disabled,
  compact,
  onSaved,
}: Props) {
  const trainingStartDate = useMemo(
    () => resolveTrainingStartDate(trainingStart),
    [trainingStart]
  );
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [error, setError] = useState("");
  const dirtyDaysRef = useRef<Set<number>>(new Set());

  const allWorkRows = useMemo(() => {
    const through = Math.max(1, currentDay || 1);
    const byDay = new Map(dayOptions.map((d) => [d.dayNumber, d]));
    const list: DayOption[] = [];
    const seen = new Set<number>();

    const pushDay = (partial: DayOption) => {
      if (partial.dayNumber < 1 || partial.dayNumber > through) return;
      if (seen.has(partial.dayNumber)) return;
      const fromSchedule = byDay.get(partial.dayNumber);
      const merged: DayOption = {
        dayNumber: partial.dayNumber,
        title: fromSchedule?.title || partial.title || `Day ${partial.dayNumber}`,
        projectName: partial.projectName || fromSchedule?.projectName || null,
        hrmsProjectId:
          partial.hrmsProjectId || fromSchedule?.hrmsProjectId || null,
        dueDate: partial.dueDate ?? fromSchedule?.dueDate ?? null,
        hasTrainingWork: true,
      };
      if (!isTrainingWorkDay(merged) && !partial.projectName?.trim()) return;
      list.push(merged);
      seen.add(partial.dayNumber);
    };

    for (const p of practiceProjects) {
      const dayNumber = p.dayNumber;
      if (dayNumber == null || !Number.isFinite(dayNumber)) continue;
      if (dayNumber > through) continue;
      pushDay({
        dayNumber,
        title: `Day ${dayNumber}`,
        projectName: p.name,
        hrmsProjectId: p.id,
        hasTrainingWork: true,
      });
    }

    for (const opt of dayOptions) {
      if (opt.dayNumber > through) continue;
      if (!isTrainingWorkDay(opt)) continue;
      pushDay(opt);
    }

    for (const saved of existing) {
      if (!saved.dayNumber || seen.has(saved.dayNumber)) continue;
      if (saved.dayNumber > through) continue;
      if (!hasSubmittedMetrics(saved)) continue;
      pushDay({
        dayNumber: saved.dayNumber,
        title: `Day ${saved.dayNumber}`,
        projectName: saved.projectName ?? null,
        hrmsProjectId: null,
        hasTrainingWork: true,
      });
    }

    return list.sort((a, b) => a.dayNumber - b.dayNumber);
  }, [dayOptions, practiceProjects, existing, currentDay]);

  const pendingRows = useMemo(
    () =>
      allWorkRows.filter((d) => {
        const saved = existing.find((e) => e.dayNumber === d.dayNumber);
        return !hasSubmittedMetrics(saved);
      }),
    [allWorkRows, existing]
  );

  const submittedRows = useMemo(
    () =>
      allWorkRows.filter((d) => {
        const saved = existing.find((e) => e.dayNumber === d.dayNumber);
        return hasSubmittedMetrics(saved);
      }),
    [allWorkRows, existing]
  );

  const syncKey = `${existingKey(existing)}:${allWorkRows
    .map((r) => r.dayNumber)
    .join(",")}`;

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<number, Draft> = { ...prev };
      for (const row of allWorkRows) {
        if (dirtyDaysRef.current.has(row.dayNumber)) continue;
        const saved = existing.find((e) => e.dayNumber === row.dayNumber);
        next[row.dayNumber] = toDraft(saved);
      }
      return next;
    });
  }, [syncKey, allWorkRows, existing]);

  function updateDraft(
    dayNumber: number,
    field: keyof Draft,
    value: string
  ) {
    dirtyDaysRef.current.add(dayNumber);
    setDrafts((prev) => ({
      ...prev,
      [dayNumber]: {
        ...(prev[dayNumber] || toDraft(null)),
        [field]: value,
      },
    }));
    setError("");
  }

  function startEdit(day: DayOption) {
    const saved = existing.find((e) => e.dayNumber === day.dayNumber);
    dirtyDaysRef.current.delete(day.dayNumber);
    setDrafts((prev) => ({
      ...prev,
      [day.dayNumber]: toDraft(saved),
    }));
    setEditingDay(day.dayNumber);
    setError("");
  }

  function cancelEdit(dayNumber: number) {
    const saved = existing.find((e) => e.dayNumber === dayNumber);
    dirtyDaysRef.current.delete(dayNumber);
    setDrafts((prev) => ({
      ...prev,
      [dayNumber]: toDraft(saved),
    }));
    setEditingDay(null);
    setError("");
  }

  async function saveRow(day: DayOption) {
    const draft = drafts[day.dayNumber] || toDraft(null);
    setSavingDay(day.dayNumber);
    setError("");
    try {
      const res = await fetch("/api/trainee-work", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traineeId,
          dayNumber: day.dayNumber,
          projectName: projectLabel(day),
          hoursLogged:
            draft.hoursLogged.trim() === "" ? null : Number(draft.hoursLogged),
          productionUnits:
            draft.productionUnits.trim() === ""
              ? null
              : Number(draft.productionUnits),
          qualityScore:
            draft.qualityScore.trim() === ""
              ? null
              : Number(draft.qualityScore),
          notes: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Could not save Day ${day.dayNumber}`);
        return;
      }
      dirtyDaysRef.current.delete(day.dayNumber);
      setEditingDay(null);
      await onSaved();
    } catch {
      setError(`Could not save Day ${day.dayNumber}`);
    } finally {
      setSavingDay(null);
    }
  }

  const inputClass = compact
    ? "w-full min-w-[3.25rem] rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs tabular-nums text-slate-100"
    : "w-full min-w-[4.5rem] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm tabular-nums text-slate-100";

  function renderDayCell(day: DayOption, className = "") {
    const dateLabel = formatDayDate(day, trainingStartDate);
    return (
      <td className={className}>
        <div className="font-medium tabular-nums text-slate-200">
          {day.dayNumber}
        </div>
        {dateLabel && (
          <div className="mt-0.5 text-xs tabular-nums text-slate-400">
            {dateLabel}
          </div>
        )}
      </td>
    );
  }

  function renderEditableRow(day: DayOption, mode: "pending" | "edit") {
    const draft = drafts[day.dayNumber] || toDraft(null);
    const busy = savingDay === day.dayNumber;
    const cell = compact ? "py-1 pr-2" : "py-2 pr-3";
    return (
      <tr key={`${mode}-${day.dayNumber}`} className="border-t border-slate-800/60">
        {renderDayCell(day, `${cell} pl-2`)}
        <td className={`${cell} text-xs text-slate-200`}>{projectLabel(day)}</td>
        <td className={cell}>
          <input
            type="number"
            min={0}
            step="0.1"
            value={draft.hoursLogged}
            disabled={disabled || busy}
            onChange={(e) =>
              updateDraft(day.dayNumber, "hoursLogged", e.target.value)
            }
            className={inputClass}
            aria-label={`Hours day ${day.dayNumber}`}
          />
        </td>
        <td className={cell}>
          <input
            type="number"
            min={0}
            step="0.1"
            value={draft.productionUnits}
            disabled={disabled || busy}
            onChange={(e) =>
              updateDraft(day.dayNumber, "productionUnits", e.target.value)
            }
            className={inputClass}
            aria-label={`Production day ${day.dayNumber}`}
          />
        </td>
        <td className={cell}>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.qualityScore}
            disabled={disabled || busy}
            onChange={(e) =>
              updateDraft(day.dayNumber, "qualityScore", e.target.value)
            }
            className={inputClass}
            aria-label={`Quality day ${day.dayNumber}`}
          />
        </td>
        <td className={cell}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void saveRow(day)}
              title="Save"
              className="inline-flex items-center justify-center rounded bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
            </button>
            {mode === "edit" && (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => cancelEdit(day.dayNumber)}
                title="Cancel"
                className="inline-flex items-center justify-center rounded border border-slate-600 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  if (allWorkRows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No training projects yet for {traineeName}.
      </p>
    );
  }

  const th = compact ? "pb-1 pr-2 font-medium" : "pb-2 pr-3 font-medium";

  return (
    <div className={compact ? "space-y-3" : "space-y-4 rounded-lg border border-slate-700/80 bg-slate-950/40 p-3"}>
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-white">{traineeName}</p>
          <p className="text-[10px] text-slate-500">
            {pendingRows.length} to enter
            {submittedRows.length > 0 ? ` · ${submittedRows.length} saved` : ""}
          </p>
        </div>
        {pendingRows.length === 0 ? (
          <p className="text-xs text-slate-500">Nothing pending.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500">
                  <th className={`${th} pl-2 pt-1.5`}>Day</th>
                  <th className={`${th} pt-1.5`}>Project</th>
                  <th className={`${th} pt-1.5`}>Hrs</th>
                  <th className={`${th} pt-1.5`}>Prod</th>
                  <th className={`${th} pt-1.5`}>QC%</th>
                  <th className={`${th} pt-1.5`}> </th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((day) => renderEditableRow(day, "pending"))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {submittedRows.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Saved
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full min-w-[480px] text-left text-xs">
              <tbody>
                {submittedRows.map((day) => {
                  if (editingDay === day.dayNumber) {
                    return renderEditableRow(day, "edit");
                  }
                  const saved = existing.find(
                    (e) => e.dayNumber === day.dayNumber
                  );
                  return (
                    <tr
                      key={`submitted-${day.dayNumber}`}
                      className="border-t border-slate-800/50 text-slate-400 first:border-t-0"
                    >
                      {renderDayCell(day, "py-1 pl-2 pr-2")}
                      <td className="py-1 pr-2 text-slate-300">
                        {projectLabel(day)}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {fmt(saved?.hoursLogged)}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {fmt(saved?.productionUnits)}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {fmt(saved?.qualityScore, "%")}
                      </td>
                      <td className="py-1 pr-2">
                        <button
                          type="button"
                          disabled={disabled || savingDay != null}
                          onClick={() => startEdit(day)}
                          title="Edit"
                          className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-amber-200">{error}</p>}
    </div>
  );
}
