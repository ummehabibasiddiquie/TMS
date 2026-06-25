import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingTemplatesManager } from "@/components/admin/onboarding/OnboardingTemplatesManager";

export default async function AdminOnboardingPage() {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Admin Panel
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            Dynamic Onboarding Management
          </h1>
          <p className="mt-2 text-slate-400">
            Configure onboarding templates, courses, quizzes, and manage approvals
          </p>
        </div>

        <OnboardingTemplatesManager />
      </div>
    </AppShell>
  );
}