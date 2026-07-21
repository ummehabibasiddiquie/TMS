import { redirect } from "next/navigation";

/** Old path — keep bookmark compatibility. */
export default function FinalExamRedirect() {
  redirect("/trainee/final-quiz");
}
