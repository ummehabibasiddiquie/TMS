import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">404</p>
        <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">This screen is not available in the onboarding flow.</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Overview
        </Link>
      </div>
    </main>
  );
}
