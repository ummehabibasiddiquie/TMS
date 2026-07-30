"use client";

import { Sparkles } from "lucide-react";
import {
  resolvePace,
  resolveProgressBand,
  type ProgressBand,
} from "@/lib/progress-band";
import { cn } from "@/lib/utils";

export function ProgressBandBadge({
  overallPercent,
  currentDay,
  totalDays,
  showPace,
  className,
}: {
  overallPercent: number;
  currentDay: number;
  totalDays: number;
  showPace?: boolean;
  className?: string;
}) {
  const band = resolveProgressBand({
    overallPercent,
    currentDay,
    totalDays,
  });
  const pace = resolvePace({ overallPercent, currentDay, totalDays });

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          band.badge
        )}
      >
        <Sparkles className="h-3 w-3" />
        {band.shortLabel}
      </span>
      {showPace && (
        <span className={cn("text-[11px] font-medium", pace.className)}>
          {pace.label}
        </span>
      )}
    </span>
  );
}

export function useProgressBand(args: {
  overallPercent: number;
  currentDay: number;
  totalDays: number;
}): ProgressBand {
  return resolveProgressBand(args);
}
