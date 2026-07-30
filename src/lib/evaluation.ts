/**
 * Final-quiz score bands — a signal for Admin review, not the only evaluation.
 * Overall training performance still matters for continue / reject decisions.
 */

export type EvaluationBand =
  | "REJECT"
  | "ATTENTION"
  | "WATCH"
  | "APPROVE"
  | "UNKNOWN";

export type EvaluationBandInfo = {
  band: EvaluationBand;
  label: string;
  /** Tailwind-ish hint for UI */
  tone: "red" | "amber" | "blue" | "emerald" | "muted";
  description: string;
};

export function getEvaluationBand(percent: number | null | undefined): EvaluationBandInfo {
  if (percent == null || Number.isNaN(percent)) {
    return {
      band: "UNKNOWN",
      label: "Pending",
      tone: "muted",
      description: "Final quiz not taken yet.",
    };
  }

  const p = Math.round(percent);

  if (p <= 50) {
    return {
      band: "REJECT",
      label: "Weak (≤50%)",
      tone: "red",
      description: "Low quiz score — review overall performance before deciding.",
    };
  }
  if (p < 75) {
    return {
      band: "ATTENTION",
      label: "Needs attention (51–74%)",
      tone: "amber",
      description: "Mixed quiz result — weigh day-wise work and lead feedback too.",
    };
  }
  if (p < 90) {
    return {
      band: "WATCH",
      label: "Near pass (75–89%)",
      tone: "blue",
      description: "Solid quiz score — still consider overall training performance.",
    };
  }
  return {
    band: "APPROVE",
    label: "Strong (≥90%)",
    tone: "emerald",
      description: "Strong quiz score — also confirm overall training performance.",
  };
}

export function bandRowClass(tone: EvaluationBandInfo["tone"]): string {
  switch (tone) {
    case "red":
      return "bg-red-50 border-red-200 dark:bg-red-950/35 dark:border-red-900/50";
    case "amber":
      return "bg-orange-50 border-orange-200 dark:bg-amber-950/30 dark:border-amber-800/40";
    case "blue":
      return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40";
    case "emerald":
      return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-800/40";
    default:
      return "bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800";
  }
}

export function bandBadgeClass(tone: EvaluationBandInfo["tone"]): string {
  switch (tone) {
    case "red":
      return "border-red-300 bg-red-100 font-semibold text-red-800 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-300";
    case "amber":
      return "border-orange-300 bg-orange-100 font-semibold text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-300";
    case "blue":
      return "border-blue-300 bg-blue-100 font-semibold text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300";
    case "emerald":
      return "border-emerald-300 bg-emerald-100 font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300";
    default:
      return "border-slate-300 bg-slate-100 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

/** Score circle on final quiz result — matches achievement band color. */
export function bandScoreCircleClass(tone: EvaluationBandInfo["tone"]): string {
  switch (tone) {
    case "red":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
    case "amber":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
    case "blue":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
    case "emerald":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}
