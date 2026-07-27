import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CurriculumProgressPanel } from "@/components/admin/CurriculumProgressPanel";
import { ProductionTrackerSection } from "@/components/admin/ProductionTrackerSection";
import { EvaluationDecisionPanel } from "@/components/admin/EvaluationDecisionPanel";

export default async function AdminProgressPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  const canDecide = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Team progress</h1>
        <p className="mt-1 text-sm text-slate-400">
          Learning progress from the day schedule, plus HRMS practice-work metrics for projects
          Lead/Admin attach on training days. Final quiz is one input; Admin decides from the full
          picture. After approval, production tracker shows live work.
        </p>
      </div>
      <CurriculumProgressPanel />
      <EvaluationDecisionPanel canDecide={canDecide} />
      <ProductionTrackerSection />
    </div>
  );
}
