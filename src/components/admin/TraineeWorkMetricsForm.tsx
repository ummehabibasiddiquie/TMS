"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import {
  formatWorkGoal,
  formatUnitsVsGoal,
  qualityScoreLabel,
} from "@/lib/work-metrics-display";
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
  productionTarget?: number | null;
  assignedHours?: number | null;
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

function parseUnitsValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function ProductionVsTarget({
  units,
  hoursLogged,
  target,
  assignedHours,
  compact,
}: {
  units: number | null;
  hoursLogged?: number | null;
  target: number | null | undefined;
  assignedHours?: number | null;
  compact?: boolean;
}) {
  const hint = compact ? "text-[10px]" : "text-xs";
  const score = compact ? "text-sm font-semibold" : "text-base font-semibold";
  const goal = formatWorkGoal(assignedHours, target);
  if (!goal) {
    return (
      <span
        className={`${hint} text-slate-500 dark:text-slate-400`}
        title="Set assigned hours and unit goal on the day's training-work item in Day Curriculum"
      >
        No goal set
      </span>
    );
  }
  return (
    <div className="space-y-0.5">
      <span className={`${hint} text-slate-500 dark:text-slate-400`}>Goal: {goal}</span>
      <span className={`${score} tabular-nums text-slate-800 dark:text-slate-200`}>
        {formatUnitsVsGoal(units, target)}
      </span>
      {hoursLogged != null && hoursLogged > 0 && (
        <span className={`${hint} tabular-nums text-slate-500 dark:text-slate-400`}>
          Logged {hoursLogged} h
        </span>
      )}
    </div>
  );
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
        productionTarget:
          fromSchedule?.productionTarget ?? partial.productionTarget ?? null,
        assignedHours:
          fromSchedule?.assignedHours ?? partial.assignedHours ?? null,
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
    ? "w-full min-w-[3.25rem] rounded border border-slate-300 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    : "w-full min-w-[5rem] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  function renderDayCell(day: DayOption, className = "") {
    const dateLabel = formatDayDate(day, trainingStartDate);
    return (
      <td className={className}>
        <div
          className={`font-semibold tabular-nums text-slate-900 dark:text-slate-100 ${
            compact ? "text-sm" : "text-lg"
          }`}
        >
          {day.dayNumber}
        </div>
        {dateLabel && (
          <div
            className={`mt-0.5 tabular-nums text-slate-500 dark:text-slate-400 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {dateLabel}
          </div>
        )}
      </td>
    );
  }

  function renderEditableRow(day: DayOption, mode: "pending" | "edit") {
    const draft = drafts[day.dayNumber] || toDraft(null);
    const busy = savingDay === day.dayNumber;
    const cell = compact ? "py-1 pr-2" : "py-3.5 pr-4";
    return (
      <tr key={`${mode}-${day.dayNumber}`} className="border-t border-slate-200 dark:border-slate-800/60">
        {renderDayCell(day, `${cell} pl-3`)}
        <td
          className={`${cell} font-medium text-slate-800 dark:text-slate-200 ${
            compact ? "text-xs" : "text-base"
          }`}
        >
          {projectLabel(day)}
        </td>
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
            aria-label={`Units completed day ${day.dayNumber}`}
          />
        </td>
        <td className={cell}>
          <ProductionVsTarget
            compact={compact}
            units={parseUnitsValue(draft.productionUnits)}
            hoursLogged={
              draft.hoursLogged.trim() === ""
                ? null
                : Number(draft.hoursLogged)
            }
            target={day.productionTarget}
            assignedHours={day.assignedHours}
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
            aria-label={`Quality percentage day ${day.dayNumber}`}
          />
        </td>
        <td className={cell}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void saveRow(day)}
              title="Save"
              className={`inline-flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 ${
                compact ? "p-1.5" : "p-2.5"
              }`}
            >
              {busy ? (
                <Loader2 className={compact ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4 animate-spin"} />
              ) : (
                <Save className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              )}
            </button>
            {mode === "edit" && (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => cancelEdit(day.dayNumber)}
                title="Cancel"
                className={`inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 ${
                  compact ? "p-1.5" : "p-2.5"
                }`}
              >
                <X className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  if (allWorkRows.length === 0) {
    return (
      <p className="text-base text-slate-500">
        No training projects yet for {traineeName}.
      </p>
    );
  }

  const th = compact
    ? "pb-2 pr-2 pt-2 font-medium"
    : "pb-3 pr-4 text-sm font-semibold uppercase tracking-wide";

  const tableHead = (
    <tr className="bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
      <th className={`${th} pl-3`}>Day</th>
      <th className={th}>Project</th>
      <th className={th}>Hours</th>
      <th className={th} title="Units the trainee completed that day">
        Units done
      </th>
      <th className={th} title="Unit count the trainee should hit in the assigned hours">
        vs unit goal
      </th>
      <th className={th} title="Quality score you enter (0–100)">
        Quality %
      </th>
      {compact ? <th className={`${th} w-24`}> </th> : <th className={th}> </th>}
    </tr>
  );

  function renderReadOnlyRow(day: DayOption) {
    const saved = existing.find((e) => e.dayNumber === day.dayNumber);
    const cell = compact ? "py-2 pr-2" : "py-3.5 pr-4";
    return (
      <tr
        key={`saved-${day.dayNumber}`}
        className="border-t border-slate-200 text-slate-700 first:border-t-0 dark:border-slate-800/50 dark:text-slate-300"
      >
        {renderDayCell(day, `${cell} pl-3`)}
        <td className={`${cell} font-medium text-slate-800 dark:text-slate-200`}>
          {projectLabel(day)}
        </td>
        <td className={`${cell} tabular-nums`}>{fmt(saved?.hoursLogged)}</td>
        <td className={`${cell} tabular-nums`}>{fmt(saved?.productionUnits)}</td>
        <td className={cell}>
          <ProductionVsTarget
            compact={compact}
            units={saved?.productionUnits ?? null}
            hoursLogged={saved?.hoursLogged ?? null}
            target={day.productionTarget}
            assignedHours={day.assignedHours}
          />
        </td>
        <td className={`${cell} tabular-nums`}>
          {qualityScoreLabel(saved?.qualityScore)}
        </td>
        <td className={cell}>
          <button
            type="button"
            disabled={disabled || savingDay != null}
            onClick={() => startEdit(day)}
            title="Edit"
            className={`inline-flex rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              compact ? "p-1.5" : "p-2.5"
            }`}
          >
            <Pencil className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "space-y-5"
      }
    >
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <p
            className={`font-semibold text-slate-900 dark:text-white ${
              compact ? "text-sm" : "text-2xl"
            }`}
          >
            {traineeName}
          </p>
          <p
            className={`text-slate-500 ${
              compact ? "text-[10px]" : "text-sm"
            }`}
          >
            {pendingRows.length} row{pendingRows.length === 1 ? "" : "s"} still empty
            {submittedRows.length > 0 ? ` · ${submittedRows.length} saved` : ""}
          </p>
        </div>
        {compact ? (
          allWorkRows.length === 0 ? (
            <p className="text-xs text-slate-500">No training-work days yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>{tableHead}</thead>
                <tbody>
                  {allWorkRows.map((day) => {
                    const saved = existing.find((e) => e.dayNumber === day.dayNumber);
                    if (!hasSubmittedMetrics(saved) || editingDay === day.dayNumber) {
                      return renderEditableRow(
                        day,
                        editingDay === day.dayNumber ? "edit" : "pending"
                      );
                    }
                    return renderReadOnlyRow(day);
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : pendingRows.length === 0 ? (
          <p className="text-base text-slate-500">Nothing pending.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[640px] text-left text-base">
              <thead>{tableHead}</thead>
              <tbody>
                {pendingRows.map((day) => renderEditableRow(day, "pending"))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!compact && submittedRows.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Saved
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[640px] text-left text-base">
              <thead>{tableHead}</thead>
              <tbody>
                {submittedRows.map((day) => {
                  if (editingDay === day.dayNumber) {
                    return renderEditableRow(day, "edit");
                  }
                  return renderReadOnlyRow(day);
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-200">{error}</p>
      )}
    </div>
  );
}
