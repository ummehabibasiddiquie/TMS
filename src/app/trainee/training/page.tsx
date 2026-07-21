import { getSession } from "@/lib/auth";
import { getDayWisePlan } from "@/lib/day-wise-training";
import { TrainingDayClient } from "./TrainingDayClient";

export default async function TrainingPage() {
  const user = await getSession();
  if (!user) return null;

  const plan = await getDayWisePlan(user.id);

  return <TrainingDayClient plan={plan} />;
}
