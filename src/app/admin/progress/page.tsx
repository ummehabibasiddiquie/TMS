import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CurriculumProgressPanel } from "@/components/admin/CurriculumProgressPanel";
import { EvaluationDecisionPanel } from "@/components/admin/EvaluationDecisionPanel";

export default async function AdminProgressPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 pb-8">
      <CurriculumProgressPanel />
      {isAdmin && <EvaluationDecisionPanel />}
    </div>
  );
}
