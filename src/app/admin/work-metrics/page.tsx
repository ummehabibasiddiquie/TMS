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
    <div className="w-full max-w-5xl space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Work metrics</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Hours · production · quality per training project
        </p>
      </div>
      <TraineeWorkMetricsManager
        initialTraineeId={searchParams?.traineeId || null}
      />
    </div>
  );
}
