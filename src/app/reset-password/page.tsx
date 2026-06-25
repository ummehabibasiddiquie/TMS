"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";
import { PasswordInput } from "@/components/ui/PasswordInput";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // If no token is provided, show error
  if (!token) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <div className="hidden flex-1 flex-col justify-between border-r border-slate-800 bg-slate-900 p-12 lg:flex">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Lock className="h-8 w-8" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              Password Reset
            </p>
            <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-white">
              Invalid reset link
            </h1>
            <p className="mt-4 max-w-md text-slate-400">
              The password reset link is invalid or has expired. Please request a new password reset link.
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Request new reset link
              </Link>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                app.traininghub.internal
              </p>
              <h2 className="mt-3 text-2xl font-bold">Invalid Reset Link</h2>
              <p className="mt-1 text-slate-400">
                Please request a new password reset link to continue
              </p>
            </div>

            <div className="rounded-lg bg-red-900/30 px-4 py-6 text-center">
              <p className="text-red-300 font-medium mb-2">
                No reset token provided
              </p>
              <p className="text-slate-400 text-sm mb-4">
                The password reset link is invalid. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 text-center"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
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
            <Lock className="h-8 w-8" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            Password Reset
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-white">
            Set your new password
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Enter your new password below. Make sure it&apos;s at least 8 characters long and different from your previous password.
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
            <h2 className="mt-3 text-2xl font-bold">
              {success ? "Password reset successful" : "Reset your password"}
            </h2>
            <p className="mt-1 text-slate-400">
              {success
                ? "Your password has been reset successfully"
                : "Enter your new password below"}
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
                Password reset successful
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500"
              >
                Proceed to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm text-slate-400">New password</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Confirm new password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}