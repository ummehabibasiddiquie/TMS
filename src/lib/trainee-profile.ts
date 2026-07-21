import { prisma } from "./db";

/** Ensure an employee has a TraineeProfile row (required for TL scoping / daily training). */
export async function ensureTraineeProfile(
  userId: string,
  data?: { trainerId?: string | null; qaId?: string | null }
) {
  const existing = await prisma.traineeProfile.findUnique({ where: { userId } });
  if (existing) {
    if (data && (data.trainerId !== undefined || data.qaId !== undefined)) {
      return prisma.traineeProfile.update({
        where: { userId },
        data: {
          ...(data.trainerId !== undefined ? { trainerId: data.trainerId } : {}),
          ...(data.qaId !== undefined ? { qaId: data.qaId } : {}),
        },
      });
    }
    return existing;
  }

  return prisma.traineeProfile.create({
    data: {
      userId,
      trainerId: data?.trainerId ?? null,
      qaId: data?.qaId ?? null,
    },
  });
}

/** Create missing profiles for every TRAINEE (safe to run on Admin Users page load). */
export async function backfillMissingTraineeProfiles() {
  const trainees = await prisma.user.findMany({
    where: {
      role: "TRAINEE",
      traineeProfile: { is: null },
    },
    select: { id: true },
  });

  if (trainees.length === 0) return 0;

  await prisma.traineeProfile.createMany({
    data: trainees.map((t) => ({ userId: t.id })),
    skipDuplicates: true,
  });

  return trainees.length;
}

export async function assertUserIsTrainer(trainerId: string | null | undefined) {
  if (!trainerId) return null;
  const trainer = await prisma.user.findFirst({
    where: { id: trainerId, role: "TRAINER", active: true },
    select: { id: true, name: true },
  });
  if (!trainer) {
    throw new Error("Selected Team Lead is invalid or inactive");
  }
  return trainer;
}

export async function assertUserIsActiveStaff(userId: string | null | undefined) {
  if (!userId) return null;
  const staff = await prisma.user.findFirst({
    where: {
      id: userId,
      active: true,
      role: { in: ["TRAINER", "ADMIN"] },
    },
    select: { id: true, name: true },
  });
  if (!staff) {
    throw new Error("Selected QA user is invalid or inactive");
  }
  return staff;
}
