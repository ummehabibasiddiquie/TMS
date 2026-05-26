"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Shield, User, UserCog } from "lucide-react";
import type { Role } from "@/types";
import { ROLE_LABELS, ROLE_LOGIN, ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<Role, React.ElementType> = {
  TRAINEE: User,
  TRAINER: UserCog,
  ADMIN: Shield,
};

const ROLE_HOME: Record<Role, string> = {
  TRAINEE: "/",
  TRAINER: "/",
  ADMIN: "/",
};

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>("TRAINEE");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const email = ROLE_LOGIN[selectedRole].email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
            Employees complete setup, Landscape training, and an 80% certification quiz while team leads and admins
            track progress.
          </p>
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-3 text-sm">
          {["Employee", "Team Lead", "Admin"].map((role) => (
            <div key={role} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="font-semibold text-slate-100">{role}</p>
              <p className="mt-1 text-xs text-slate-500">Phase 1 access</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              app.traininghub.internal
            </p>
            <h2 className="mt-3 text-2xl font-bold">Sign in to your account</h2>
            <p className="mt-1 text-slate-400">Pick a default account or enter the password.</p>
          </div>

          <div>
            <label className="mb-3 block text-sm text-slate-400">Default accounts</label>
            <div className="grid gap-3">
              {ROLES.map((role) => {
                const Icon = ROLE_ICONS[role];
                const active = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4 text-left transition",
                      active
                        ? "border-blue-500 bg-blue-600/20 ring-1 ring-blue-500"
                        : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-blue-300" : "text-slate-500")} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{ROLE_LABELS[role]}</span>
                      <span className="block truncate text-xs text-slate-500">{ROLE_LOGIN[role].email}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">{error}</div>}

          <div>
            <label className="text-sm text-slate-400">Email address</label>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-300"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Demo password: password123</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Signing in..." : `Sign in as ${ROLE_LABELS[selectedRole]}`}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="text-center text-xs text-slate-500">Forgot your password? Contact your Admin.</p>
        </form>
      </div>
    </div>
  );
}
