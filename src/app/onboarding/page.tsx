import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { onboardingProgress, onboardingSteps } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const progress = onboardingProgress();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Onboarding Flow</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Complete every step in order</h1>
          <p className="mt-2 text-slate-400">Manual steps are marked done by your Team Lead.</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-white">
              Overall Progress - {progress.completed} of {progress.total} steps complete
            </p>
            <p className="text-sm font-semibold text-blue-300">{progress.percent}%</p>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {onboardingSteps.map((step) => {
            const locked = step.status === "locked";
            const done = step.status === "done";
            const Icon = done ? CheckCircle2 : locked ? Lock : Circle;
            return (
              <div
                key={step.title}
                className={cn(
                  "rounded-lg border p-5",
                  locked ? "border-slate-800 bg-slate-900/50 opacity-70" : "border-slate-800 bg-slate-900"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <Icon className={cn("mt-1 h-5 w-5", done ? "text-emerald-300" : "text-blue-300")} />
                    <div>
                      <h2 className="font-semibold text-white">{step.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {step.day} - {step.duration} - {step.type}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{step.description}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "w-fit rounded-full px-3 py-1 text-xs font-medium capitalize",
                      done && "bg-emerald-500/15 text-emerald-300",
                      step.status === "active" && "bg-blue-500/15 text-blue-300",
                      step.status === "pending" && "bg-amber-500/15 text-amber-300",
                      locked && "bg-slate-700 text-slate-300"
                    )}
                  >
                    {step.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
