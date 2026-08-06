import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TraineeWorkMetricsManager } from "@/components/admin/TraineeWorkMetricsManager";

export default async function AdminWorkMetricsPage({
  searchParams,
}: {
  searchParams?: { traineeId?: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  return (
    <div className="w-full max-w-7xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Work Metrics
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Hours · production · quality per training project
        </p>
      </div>
      <TraineeWorkMetricsManager
        initialTraineeId={searchParams?.traineeId || null}
      />
    </div>
  );
}
