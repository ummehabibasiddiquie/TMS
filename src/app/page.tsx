import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import {
  getAdminDashboardStats,
  getTeamLeadDashboardStats,
} from "@/lib/dashboard-stats";
import { AdminOverview, TeamLeadOverview } from "@/components/dashboard/ManagementOverview";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (user.role === "TRAINEE") {
    redirect("/trainee");
  }

  if (user.role === "ADMIN") {
    let stats;
    try {
      stats = await getAdminDashboardStats();
    } catch (error) {
      console.error("Failed to load admin dashboard stats:", error);
      // Provide fallback stats to prevent page from crashing
      stats = {
        activeTrainees: 0,
        courses: 0,
        projects: 0,
        pendingCerts: 0,
        awaitingEvaluation: 0,
        overdueTrainees: 0,
        dueTodayTrainees: 0,
        dayReviewsGiven: 0,
        attention: [],
      };
    }
    return (
      <AppShell user={user}>
        <AdminOverview name={user.name} stats={stats} />
      </AppShell>
    );
  }

  if (user.role === "TRAINER" || user.role === "TEAM_LEAD") {
    let stats;
    try {
      stats = await getTeamLeadDashboardStats(user.id);
    } catch (error) {
      console.error("Failed to load team lead dashboard stats:", error);
      // Provide fallback stats to prevent page from crashing
      stats = {
        activeTrainees: 0,
        courses: 0,
        projects: 0,
        pendingCerts: 0,
        awaitingEvaluation: 0,
        overdueTrainees: 0,
        dueTodayTrainees: 0,
        dayReviewsGiven: 0,
        attention: [],
      };
    }
    return (
      <AppShell user={user}>
        <TeamLeadOverview name={user.name} stats={stats} />
      </AppShell>
    );
  }

  redirect("/login");
}
