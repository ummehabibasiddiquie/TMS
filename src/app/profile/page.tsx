"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { formatRole } from "@/lib/roles";
import type { Role } from "@/types";

export const dynamic = 'force-dynamic';

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  dateOfJoining: Date | null;
  createdAt: Date;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell user={user || { name: "", email: "", role: "TRAINEE" }}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dateJoined = user.dateOfJoining
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(user.dateOfJoining)
      )
    : "Not available";

  return (
    <AppShell user={user}>
      <div className="w-full space-y-8 px-4 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Profile & Settings</p>
          <h1 className="mt-3 text-3xl font-bold text-white">View your personal details</h1>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              <p className="text-slate-400">{user.email}</p>
              <p className="text-sm text-slate-500">{formatRole(user.role)} - Annotation Dept</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">Personal Details</h2>
          <div className="mt-4 space-y-4">
            {[
              ["Full Name", user.name],
              ["Email Address", user.email],
              ["Employee ID", user.employeeId || "Not assigned"],
              ["Department", "Annotation"],
              ["Date Joined", dateJoined],
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
          <h2 className="font-semibold text-white">My Certifications</h2>
          <p className="mt-2 text-sm text-slate-400">View your earned certifications and achievements.</p>
          <Link href="/certifications" className="mt-4 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
            View All Certificates
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
