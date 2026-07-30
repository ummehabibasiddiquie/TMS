import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDayWisePlan } from "@/lib/day-wise-training";
import { listTraineeWorkMetrics } from "@/lib/trainee-work";
import { TraineeOverview } from "@/components/trainee/TraineeOverview";

export default async function TraineeHomePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "TRAINEE") redirect("/");

  const [plan, work] = await Promise.all([
    getDayWisePlan(user.id),
    listTraineeWorkMetrics(user.id),
  ]);

  return <TraineeOverview name={user.name} plan={plan} work={work} />;
}
