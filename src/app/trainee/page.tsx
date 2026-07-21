import { redirect } from "next/navigation";

/** Dashboard removed — Today's Work is the trainee home. */
export default function TraineeIndexPage() {
  redirect("/trainee/training");
}
