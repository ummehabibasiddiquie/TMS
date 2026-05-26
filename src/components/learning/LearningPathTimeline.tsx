import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  status: "completed" | "current" | "locked" | "available";
  subtitle?: string;
};

export function LearningPathTimeline({ steps }: { steps: Step[] }) {
  return (
    <div className="glass-panel p-6">
      <h3 className="mb-6 text-lg font-semibold">Learning Path</h3>
      <div className="relative space-y-0">
        {steps.map((step, i) => (
          <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-[15px] top-8 h-full w-0.5",
                  step.status === "completed" ? "bg-emerald-500/50" : "bg-slate-700"
                )}
              />
            )}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                step.status === "completed" && "border-emerald-500 bg-emerald-500/20 text-emerald-400",
                step.status === "current" && "border-blue-500 bg-blue-500/20 text-blue-400 animate-pulse-slow",
                step.status === "locked" && "border-slate-600 bg-slate-800 text-slate-500",
                step.status === "available" && "border-slate-500 bg-slate-800 text-slate-400"
              )}
            >
              {step.status === "completed" && <CheckCircle2 className="h-4 w-4" />}
              {step.status === "current" && <Circle className="h-4 w-4 fill-current" />}
              {step.status === "locked" && <Lock className="h-3 w-3" />}
              {step.status === "available" && <Circle className="h-4 w-4" />}
            </div>
            <div>
              <p
                className={cn(
                  "font-medium",
                  step.status === "current" && "text-blue-300",
                  step.status === "locked" && "text-slate-500"
                )}
              >
                {step.title}
              </p>
              {step.subtitle && (
                <p className="text-sm text-slate-500">{step.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
