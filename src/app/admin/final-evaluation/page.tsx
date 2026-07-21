import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FinalEvaluationQuizManager } from "@/components/admin/FinalEvaluationQuizManager";

export default async function FinalEvaluationAdminPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/admin/progress");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Final evaluation quiz</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure the one-attempt quiz shown to every trainee after all day-wise days are done
          (including any extra week).
        </p>
      </div>
      <FinalEvaluationQuizManager />
    </div>
  );
}
