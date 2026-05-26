export const PHASE_LABELS: Record<string, string> = {
  QUALITY_FOCUS: "Phase 1 — Quality Focus",
  QUALITY_PRODUCTIVITY: "Phase 2 — Quality + Productivity",
  PRODUCTION_SIMULATION: "Phase 3 — Production Simulation",
};

export function formatPhase(phase: string): string {
  return PHASE_LABELS[phase] ?? phase.replace(/_/g, " ");
}
