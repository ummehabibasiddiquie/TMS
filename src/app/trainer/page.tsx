import { redirect } from "next/navigation";

/** Legacy route — team lead dashboard lives at `/`. */
export default function TrainerDashboardRedirect() {
  redirect("/");
}
