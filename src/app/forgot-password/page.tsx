"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to send reset email");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden flex-1 flex-col justify-between border-r border-slate-800 bg-slate-900 p-12 lg:flex">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Mail className="h-8 w-8" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            Password Reset
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-white">
            Reset your password securely
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Enter your email address and we&apos;ll send you a secure link to reset your password. The link will expire in 15 minutes.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              app.traininghub.internal
            </p>
            <h2 className="mt-3 text-2xl font-bold">Forgot your password?</h2>
            <p className="mt-1 text-slate-400">
              {success
                ? "Check your email for the reset link"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-lg bg-emerald-900/30 px-4 py-6 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-300 font-medium mb-2">
                Reset link sent successfully
              </p>
              <p className="text-slate-400 text-sm">
                If an account with that email exists, a password reset link has been sent. Please check your inbox and spam folder.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500"
              >
                Return to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm text-slate-400">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-300 focus:border-blue-500 focus:outline-none"
                  placeholder="your.email@company.in"
                  required
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            Remember your password?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
