import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { formatRole } from "@/lib/roles";

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Profile & Settings</p>
          <h1 className="mt-3 text-3xl font-bold text-white">View and update your personal details</h1>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              <p className="text-slate-400">{user.email}</p>
              <p className="text-sm text-slate-500">{formatRole(user.role)} - Annotation Dept</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Personal Details</h2>
            <div className="mt-4 space-y-4">
              {[
                ["Full Name", user.name],
                ["Email Address", user.email],
                ["Department", "Annotation"],
                ["Date Joined", "10 May 2025"],
              ].map(([label, value]) => (
                <label key={label} className="block text-sm text-slate-400">
                  {label}
                  <input
                    readOnly
                    value={value}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Change Password</h2>
            <div className="mt-4 space-y-4">
              {["Current Password", "New Password", "Confirm New Password"].map((label) => (
                <label key={label} className="block text-sm text-slate-400">
                  {label}
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                  />
                </label>
              ))}
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Update Password</button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">My Certifications</h2>
          <p className="mt-2 text-sm text-slate-400">1 certification earned - Landscape (issued 18 May 2025, score 5/5)</p>
          <Link href="/certifications" className="mt-4 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
            View All Certificates
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
