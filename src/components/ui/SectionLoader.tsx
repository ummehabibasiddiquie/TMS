import { Loader2 } from "lucide-react";

/** Compact spinner for panels/sections (not full-page). */
export function SectionLoader({
  message = "Loading…",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-8 text-sm text-slate-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-400" />
      <span>{message}</span>
    </div>
  );
}

/** Sticky status bar while a slow action runs (add days, save, etc.). */
export function WorkingBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/50 dark:text-blue-100"
      role="status"
      aria-live="assertive"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600 dark:text-blue-300" />
      <div>
        <p className="font-medium">{message}</p>
        <p className="mt-0.5 text-xs text-blue-800/80 dark:text-blue-200/70">
          Please wait — this can take up to a minute. Don’t refresh or click again.
        </p>
      </div>
    </div>
  );
}
