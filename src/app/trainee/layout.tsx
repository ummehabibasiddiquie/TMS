import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function TraineeLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "TRAINER") redirect("/trainer");
  if (user.role !== "TRAINEE") redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
