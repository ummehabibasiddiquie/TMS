import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { listHrmsProjects } from "@/lib/hrms";
import { HrmsProjectList } from "@/components/projects/HrmsProjectList";

export default async function ProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Admin / Team Lead use the admin projects page
  if (user.role === "ADMIN" || user.role === "TRAINER") {
    redirect("/admin/projects");
  }

  // Trainees: read-only active HRMS projects (for awareness; training comes from Day Curriculum)
  const result = await listHrmsProjects({ activeOnly: true });

  return (
    <AppShell user={user}>
      <HrmsProjectList
        projects={result.projects}
        configured={result.configured}
        connected={result.connected}
        message={result.message}
      />
    </AppShell>
  );
}
