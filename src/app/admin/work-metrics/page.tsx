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
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Log hours and units the trainee actually did. The unit goal is set in Day Curriculum
          (example: 2 hours and 100 units means 100 units should be completed in that 2-hour
          block—not a percentage). Quality is your 0–100 score for that day.
        </p>
      </div>
      <TraineeWorkMetricsManager
        initialTraineeId={searchParams?.traineeId || null}
      />
    </div>
  );
}
