"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-300">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold">The page could not load</h1>
        <p className="mt-2 text-sm text-slate-400">{error.message || "Please refresh and try again."}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </main>
  );
}
