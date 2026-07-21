"use client";

import { useEffect, useState } from "react";
import { Activity, Database } from "lucide-react";

type TrackerPayload = {
  trainee?: {
    readyForProduction: boolean;
    trainingStatus: string | null;
  };
  tracker: {
    connected: boolean;
    configured: boolean;
    message?: string;
    tasksCompleted?: number | null;
    tasksTotal?: number | null;
    qualityScore?: number | null;
    hoursLogged?: number | null;
    lastActivityAt?: string | null;
  };
};

type Props = {
  /** When set, Admin/TL loads that trainee; otherwise loads current user. */
  userId?: string;
  /** Only show full panel when production-ready (unless forceShow). */
  forceShow?: boolean;
  compact?: boolean;
};

export function TrackerProgressPanel({ userId, forceShow, compact }: Props) {
  const [data, setData] = useState<TrackerPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/tracker/progress${qs}`);
      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json.error || "Failed to load tracker");
        return;
      }
      setData(json);
    })();
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading production work…</p>;
  }
  if (error) {
    return <p className="text-sm text-amber-300">{error}</p>;
  }
  if (!data) return null;

  const ready = data.trainee?.readyForProduction === true;
  if (!forceShow && !ready) {
    return null;
  }

  const t = data.tracker;
  const pct =
    t.tasksTotal && t.tasksTotal > 0
      ? Math.round(((t.tasksCompleted ?? 0) / t.tasksTotal) * 100)
      : null;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-slate-700 bg-slate-900/50 p-4"
          : "rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-5"
      }
    >
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-200">
        <Activity className="h-4 w-4" />
        Production work (Tracker)
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        After Admin approves you (overall training performance), live work metrics come from the
        tracker.
      </p>

      {!t.configured ? (
        <div className="flex items-start gap-2 text-sm text-slate-400">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t.message || "Tracker not configured."}</span>
        </div>
      ) : t.message && t.tasksTotal == null ? (
        <p className="text-sm text-amber-200/90">{t.message}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Tasks done</p>
            <p className="text-lg font-semibold text-white">
              {t.tasksCompleted ?? 0}
              {t.tasksTotal != null ? (
                <span className="text-sm font-normal text-slate-500"> / {t.tasksTotal}</span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Completion</p>
            <p className="text-lg font-semibold text-white">{pct != null ? `${pct}%` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Quality</p>
            <p className="text-lg font-semibold text-white">
              {t.qualityScore != null ? `${t.qualityScore}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Hours logged</p>
            <p className="text-lg font-semibold text-white">
              {t.hoursLogged != null ? t.hoursLogged : "—"}
            </p>
          </div>
          {t.lastActivityAt && (
            <p className="sm:col-span-4 text-xs text-slate-500">
              Last activity: {new Date(t.lastActivityAt).toLocaleString()}
            </p>
          )}
          {t.message && (
            <p className="sm:col-span-4 text-xs text-slate-500">{t.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
