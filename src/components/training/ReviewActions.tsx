"use client";

import { useState } from "react";

type Review = {
  id: string;
  status: string;
  remarks?: string | null;
} | null;

export function ReviewActions({
  submissionId,
  reviewerId,
  existing,
  traineeName,
}: {
  submissionId: string;
  type?: "trainer";
  reviewerId: string;
  existing: Review;
  traineeName?: string;
}) {
  const [text, setText] = useState(existing?.remarks ?? "");
  const [status, setStatus] = useState(existing?.status ?? "PENDING");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        reviewerId,
        status,
        remarks: text,
      }),
    });
    setLoading(false);
    window.location.reload();
  }

  if (existing && existing.status !== "PENDING") {
    return (
      <div className="mt-4 rounded-xl bg-emerald-900/20 p-4 text-sm">
        <p className="font-medium text-emerald-300">
          Review completed{traineeName ? ` for ${traineeName}` : ""}: {existing.status}
        </p>
        {existing.remarks && <p className="mt-1 text-slate-300">{existing.remarks}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {traineeName && (
        <p className="text-sm text-slate-400">
          Submitting review for <span className="font-medium text-white">{traineeName}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Team Lead remarks"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500"
        >
          {loading ? "Saving..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
