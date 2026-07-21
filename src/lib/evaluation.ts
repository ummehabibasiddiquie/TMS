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
  tone: "red" | "amber" | "slate" | "emerald" | "muted";
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
      tone: "slate",
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
      return "bg-red-950/35 border-red-900/50";
    case "amber":
      return "bg-amber-950/30 border-amber-800/40";
    case "emerald":
      return "bg-emerald-950/25 border-emerald-800/40";
    case "slate":
      return "bg-slate-900/60 border-slate-700";
    default:
      return "bg-slate-900/40 border-slate-800";
  }
}

export function bandBadgeClass(tone: EvaluationBandInfo["tone"]): string {
  switch (tone) {
    case "red":
      return "bg-red-500/20 text-red-200 border-red-700/50";
    case "amber":
      return "bg-amber-500/20 text-amber-200 border-amber-700/50";
    case "emerald":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-700/50";
    case "slate":
      return "bg-slate-500/20 text-slate-200 border-slate-600/50";
    default:
      return "bg-slate-800 text-slate-400 border-slate-700";
  }
}
