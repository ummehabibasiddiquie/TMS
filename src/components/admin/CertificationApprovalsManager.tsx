"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";

type PendingCert = {
  id: string;
  score: number;
  status: string;
  submittedAt: string;
  user: { id: string; name: string; email: string; employeeId: string | null };
  project: { id: string; name: string; categoryRel: { name: string } | null };
};

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
};

export function CertificationApprovalsManager() {
  const [items, setItems] = useState<PendingCert[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/certifications/pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.certifications || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    setActingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setItems((prev) => prev.filter((c) => c.id !== id));
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: action === "APPROVE" ? prev.approved + 1 : prev.approved,
        rejected: action === "REJECT" ? prev.rejected + 1 : prev.rejected,
      }));
      setMessage(action === "APPROVE" ? "Certificate approved." : "Certificate rejected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Certification review
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Approve project certificates</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            When an employee scores 80%+ on a project course quiz, the request appears here.
            Approve to unlock View/Download for them, or reject to keep them uncertified.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Pending review", value: stats.pending, icon: Clock, tone: "text-amber-300" },
          { label: "Approved", value: stats.approved, icon: Trophy, tone: "text-emerald-300" },
          { label: "Rejected", value: stats.rejected, icon: X, tone: "text-rose-300" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <div className="rounded-lg bg-slate-800 p-2.5">
              <stat.icon className={`h-5 w-5 ${stat.tone}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-white">Pending queue</h2>
          <p className="text-xs text-slate-500">
            Review each quiz result before issuing a certificate.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pending certifications…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-white">No pending reviews</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
              Passed project quizzes from My Courses or the project quiz page will show here for
              approval.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{item.user.name}</p>
                    <span className="inline-flex rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                      Pending review
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {item.user.employeeId ? `${item.user.employeeId} · ` : ""}
                    {item.user.email}
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">{item.project.name}</span>
                    {item.project.categoryRel?.name
                      ? ` · ${item.project.categoryRel.name}`
                      : ""}
                  </p>
                  <p className="text-sm text-emerald-300">
                    Score {Math.round(item.score)}%
                    <span className="text-slate-500">
                      {" "}
                      · {new Date(item.submittedAt).toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => review(item.id, "APPROVE")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => review(item.id, "REJECT")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
