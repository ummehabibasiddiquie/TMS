/** Production score as a percentage of the curriculum target (0–100+). */
export function productionScorePercent(
  units: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (units == null || target == null || !Number.isFinite(units) || !Number.isFinite(target)) {
    return null;
  }
  if (target <= 0) return null;
  return Math.round((units / target) * 1000) / 10;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${value}%`;
}

export function qualityScoreLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 10) / 10}%`;
}
