import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listHrmsProjects } from "@/lib/hrms";
import { HrmsProjectList } from "@/components/projects/HrmsProjectList";

export default async function AdminProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "TRAINER") redirect("/");

  // Show all HRMS projects (active + inactive) for Admin/TL visibility
  const result = await listHrmsProjects({ activeOnly: false });

  return (
    <HrmsProjectList
      projects={result.projects}
      configured={result.configured}
      connected={result.connected}
      message={result.message}
    />
  );
}
