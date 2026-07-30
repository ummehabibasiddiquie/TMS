/**
 * Visual progress bands for training dashboards.
 * Combines completion % with pace vs opened day.
 */

export type ProgressBandId =
  | "BEGINNER"
  | "DEVELOPING"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXCELLENT";

export type ProgressBand = {
  id: ProgressBandId;
  label: string;
  shortLabel: string;
  /** Tailwind-friendly tone for badges / rings */
  tone: "red" | "orange" | "amber" | "lime" | "emerald";
  ring: string;
  badge: string;
  soft: string;
  bar: string;
  description: string;
};

const BANDS: Record<ProgressBandId, ProgressBand> = {
  BEGINNER: {
    id: "BEGINNER",
    label: "Beginner",
    shortLabel: "Beginner",
    tone: "red",
    ring: "#ef4444",
    badge:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
    soft: "from-red-500/20 via-red-500/5 to-transparent",
    bar: "bg-red-500",
    description: "Just getting started — keep ticking today’s items.",
  },
  DEVELOPING: {
    id: "DEVELOPING",
    label: "Developing",
    shortLabel: "Developing",
    tone: "orange",
    ring: "#f97316",
    badge:
      "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300",
    soft: "from-orange-500/20 via-orange-500/5 to-transparent",
    bar: "bg-orange-500",
    description: "Building momentum — a bit more focus will move you up.",
  },
  INTERMEDIATE: {
    id: "INTERMEDIATE",
    label: "Intermediate",
    shortLabel: "Intermediate",
    tone: "amber",
    ring: "#eab308",
    badge:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
    soft: "from-amber-500/20 via-amber-500/5 to-transparent",
    bar: "bg-amber-400",
    description: "Solid progress — you’re past the halfway mark.",
  },
  ADVANCED: {
    id: "ADVANCED",
    label: "Advanced",
    shortLabel: "Advanced",
    tone: "lime",
    ring: "#84cc16",
    badge:
      "border-lime-200 bg-lime-50 text-lime-900 dark:border-lime-500/30 dark:bg-lime-500/15 dark:text-lime-300",
    soft: "from-lime-500/20 via-lime-500/5 to-transparent",
    bar: "bg-lime-500",
    description: "Strong pace — finish strong and keep quality high.",
  },
  EXCELLENT: {
    id: "EXCELLENT",
    label: "Excellent",
    shortLabel: "Excellent",
    tone: "emerald",
    ring: "#10b981",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
    soft: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    bar: "bg-emerald-500",
    description: "Outstanding — you’re near or at completion.",
  },
};

export type PaceStatus = {
  id: "BEHIND" | "ON_TRACK" | "AHEAD";
  label: string;
  className: string;
};

/** Band from overall completion alone. */
export function bandFromPercent(percent: number): ProgressBand {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 20) return BANDS.BEGINNER;
  if (p < 40) return BANDS.DEVELOPING;
  if (p < 65) return BANDS.INTERMEDIATE;
  if (p < 85) return BANDS.ADVANCED;
  return BANDS.EXCELLENT;
}

/**
 * Prefer pace-aware band when day is open far ahead of completion
 * (e.g. Day 10 with ~10% → Beginner / behind).
 */
export function resolveProgressBand(args: {
  overallPercent: number;
  currentDay: number;
  totalDays: number;
  /** Share of days marked done (0–100), optional */
  daysDonePercent?: number;
}): ProgressBand {
  const { overallPercent, currentDay, totalDays } = args;
  const base = bandFromPercent(overallPercent);

  if (totalDays <= 0 || currentDay <= 0) return base;

  const expected = Math.round((currentDay / totalDays) * 100);
  const gap = expected - overallPercent;

  // Far behind schedule → force cooler (worse) band
  if (gap >= 40) return BANDS.BEGINNER;
  if (gap >= 25) {
    return overallPercent < 40 ? BANDS.BEGINNER : BANDS.DEVELOPING;
  }
  if (gap >= 15) {
    const order: ProgressBandId[] = [
      "BEGINNER",
      "DEVELOPING",
      "INTERMEDIATE",
      "ADVANCED",
      "EXCELLENT",
    ];
    const idx = Math.max(0, order.indexOf(base.id) - 1);
    return BANDS[order[idx]];
  }

  return base;
}

export function resolvePace(args: {
  overallPercent: number;
  currentDay: number;
  totalDays: number;
}): PaceStatus {
  const { overallPercent, currentDay, totalDays } = args;
  if (totalDays <= 0) {
    return {
      id: "ON_TRACK",
      label: "On track",
      className: "text-sky-700 dark:text-sky-300",
    };
  }
  const expected = (currentDay / totalDays) * 100;
  const delta = overallPercent - expected;
  if (delta <= -15) {
    return {
      id: "BEHIND",
      label: "Behind schedule",
      className: "text-red-700 dark:text-red-300",
    };
  }
  if (delta >= 10) {
    return {
      id: "AHEAD",
      label: "Ahead of schedule",
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    id: "ON_TRACK",
    label: "On track",
    className: "text-sky-700 dark:text-sky-300",
  };
}

export function dueToneClass(status: string): string {
  switch (status) {
    case "OVERDUE":
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
    case "DUE_TODAY":
      return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200";
    case "DONE_LATE":
      return "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300";
    case "DONE_ON_TIME":
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400";
  }
}

/** Pill chips for overdue / due today / finished-late counts in page headers. */
export function dueSummaryChipClass(kind: "OVERDUE" | "DUE_TODAY" | "DONE_LATE"): string {
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${dueToneClass(kind)}`;
}

export function formatFinishedLateLabel(count: number): string {
  return `${count} day${count === 1 ? "" : "s"} finished late`;
}
