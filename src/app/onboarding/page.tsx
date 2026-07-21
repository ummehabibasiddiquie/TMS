import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      <div className="max-w-3xl space-y-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Getting started
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Welcome</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            A short guide to how day-wise training works. Your real checklist and lessons are in
            Today&apos;s Work.
          </p>
        </div>

        <OnboardingGuide />
      </div>
    </AppShell>
  );
}
