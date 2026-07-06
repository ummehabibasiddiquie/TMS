"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Role } from "@/types";
import { PasswordInput } from "@/components/ui/PasswordInput";

const ROLE_HOME: Record<Role, string> = {
  TRAINEE: "/",
  TRAINER: "/",
  ADMIN: "/",
  TEAM_LEAD: "/",
  EMPLOYEE: "/",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    router.push(ROLE_HOME[data.user.role as Role] || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden flex-1 flex-col justify-between border-r border-slate-800 bg-slate-900 p-12 lg:flex">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-8 w-8" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            Training Hub
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-white">
            Internal onboarding before live project work.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Employees complete setup, project training, and an 80% certification quiz while team leads and admins
            track progress.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              app.traininghub.internal
            </p>
            <h2 className="mt-3 text-2xl font-bold">Sign in to your account</h2>
            <p className="mt-1 text-slate-400">Enter your email and password to continue.</p>
          </div>

          {error && <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">{error}</div>}

          <div>
            <label className="text-sm text-slate-400">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-300 focus:border-blue-500 focus:outline-none"
              placeholder="your.email@company.in"
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Password</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="text-center text-xs text-slate-500">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300">
              Reset it here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
