"use client";

import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  /** Hex stroke color for the progress arc */
  color?: string;
  className?: string;
};

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  color,
  className,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const gradId = `ringGradient-${Math.round(clamped)}-${(color || "def").replace("#", "")}`;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ? `url(#${gradId})` : `url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color || "#3b82f6"} />
            <stop offset="100%" stopColor={color || "#22d3ee"} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
        )}
      </div>
      {sublabel && <p className="mt-2 text-sm text-slate-400">{sublabel}</p>}
    </div>
  );
}
