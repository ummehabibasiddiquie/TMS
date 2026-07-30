import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FinalEvaluationQuizManager } from "@/components/admin/FinalEvaluationQuizManager";

export default async function FinalEvaluationAdminPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          Admin — Final Evaluation
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Final evaluation quiz</h1>
        <p className="mt-1 text-sm text-slate-400">
          Admin and Team Lead can add, edit, import, or remove questions. Trainees get one attempt
          after all day-wise days are done (including any extra week).
        </p>
      </div>
      <FinalEvaluationQuizManager />
    </div>
  );
}
