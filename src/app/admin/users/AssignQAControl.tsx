"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AssignQAControl({
  traineeUserId,
  currentQaId,
  qaUsers,
}: {
  traineeUserId: string;
  currentQaId: string | null;
  qaUsers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [qaId, setQaId] = useState(currentQaId ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch("/api/trainees/assign-qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traineeUserId, qaId: qaId || null }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={qaId}
        onChange={(e) => setQaId(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
      >
        <option value="">Unassigned</option>
        {qaUsers.map((q) => (
          <option key={q.id} value={q.id}>
            {q.name}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-2 py-1 text-xs hover:bg-blue-500 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}
