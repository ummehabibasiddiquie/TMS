import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersClient } from "./UsersClient";
import { backfillMissingTraineeProfiles } from "@/lib/trainee-profile";

function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "TRAINER")) {
    redirect("/");
  }

  const isTeamLead = session.role === "TRAINER";

  try {
    await backfillMissingTraineeProfiles();
  } catch (error) {
    console.error("Trainee profile backfill failed:", error);
  }

  const users = await prisma.user.findMany({
    where: isTeamLead
      ? {
          role: "TRAINEE",
          traineeProfile: { trainerId: session.id },
        }
      : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      active: true,
      dateOfJoining: true,
      traineeProfile: {
        select: {
          trainerId: true,
          trainer: { select: { id: true, name: true } },
        },
      },
    },
  });

  const teamLeads = isTeamLead
    ? [{ id: session.id, name: session.name, email: session.email }]
    : users
        .filter((u) => u.role === "TRAINER" && u.active === true)
        .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <UsersClient
      mode={isTeamLead ? "teamlead" : "admin"}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        employeeId: u.employeeId,
        active: u.active === true,
        dateOfJoining: toDateString(u.dateOfJoining),
        trainerId: u.traineeProfile?.trainerId ?? null,
        trainerName: u.traineeProfile?.trainer?.name ?? null,
      }))}
      teamLeads={teamLeads}
    />
  );
}
