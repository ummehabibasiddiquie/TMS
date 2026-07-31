"use client";

import { RotateCcw, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error details in production for debugging
    console.error("Application error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-300">
            Something went wrong
          </p>
        </div>
        <h1 className="mt-4 text-2xl font-bold">The page could not load</h1>
        <p className="mt-2 text-sm text-slate-400">
          {error.message || "An unexpected error occurred. Please refresh and try again."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-500 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </main>
  );
}
