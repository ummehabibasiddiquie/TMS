/** Units expected for the day (from Day Curriculum), within assigned hours. */
export function formatWorkGoal(
  assignedHours: number | null | undefined,
  targetUnits: number | null | undefined
): string | null {
  if (targetUnits == null || !Number.isFinite(targetUnits) || targetUnits <= 0) {
    return null;
  }
  const units = Math.round(targetUnits);
  if (
    assignedHours != null &&
    Number.isFinite(assignedHours) &&
    assignedHours > 0
  ) {
    const h = assignedHours % 1 === 0 ? String(assignedHours) : String(assignedHours);
    return `${units} units in ${h} h`;
  }
  return `${units} units expected`;
}

/** Logged units vs curriculum unit goal (counts, not a percent target). */
export function formatUnitsVsGoal(
  units: number | null | undefined,
  targetUnits: number | null | undefined
): string {
  if (targetUnits == null || !Number.isFinite(targetUnits) || targetUnits <= 0) {
    return "—";
  }
  const goal = Math.round(targetUnits);
  if (units == null || !Number.isFinite(units)) return `— / ${goal} units`;
  return `${units} / ${goal} units`;
}

/** Optional pace: units per hour vs goal pace (targetUnits / assignedHours). */
export function productionScorePercent(
  units: number | null | undefined,
  targetUnits: number | null | undefined
): number | null {
  if (
    units == null ||
    targetUnits == null ||
    !Number.isFinite(units) ||
    !Number.isFinite(targetUnits)
  ) {
    return null;
  }
  if (targetUnits <= 0) return null;
  const raw = (units / targetUnits) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${value}%`;
}

export function qualityScoreLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 10) / 10}%`;
}
