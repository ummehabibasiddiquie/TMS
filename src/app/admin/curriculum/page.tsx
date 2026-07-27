import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CurriculumManager } from "@/components/admin/CurriculumManager";
import { backfillDefaultCurriculumForTrainees } from "@/lib/day-wise-training";

export default async function AdminCurriculumPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  try {
    await backfillDefaultCurriculumForTrainees();
  } catch (error) {
    console.error("Default curriculum backfill failed:", error);
  }

  return (
    <Suspense fallback={<p className="text-slate-400">Loading curriculum…</p>}>
      <CurriculumManager />
    </Suspense>
  );
}
