import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProgressReportsManager } from "@/components/admin/ProgressReportsManager";

export default async function AdminProgressPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  return <ProgressReportsManager user={user} />;
}
